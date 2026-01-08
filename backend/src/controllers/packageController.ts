import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildMultiFieldSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, parseBooleanParam, ApiResponse } from '../types';
import { parseServiceList, formatServiceList, calculateTotalPrice, parseDateDMY } from '../utils/packageHelper';
import { getBatchPricing } from '../utils/contractPricingHelper';

/**
 * GET /api/packages - List with search & pagination
 * Supports query parameter ?select=true for dropdown/select options
 */
export const getAllPackages = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if this is a select/dropdown request
    const isSelect = parseBooleanParam(req.query.select as string | string[] | undefined);

    if (isSelect) {
      // Return simplified data for dropdown/select
      const packages = await (prisma as any).package.findMany({
        where: {
          trash: null
        },
        select: {
          id: true,
          code: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        data: packages
      });
      return;
    }

    // Standard list with pagination
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where = {
      trash: null,
      ...buildMultiFieldSearchCondition(['name', 'code'], search),
    };

    const [data, total] = await Promise.all([
      (prisma as any).package.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true
            }
          }
        }
      }),
      (prisma as any).package.count({ where })
    ]);

    const response: ApiResponse = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('getAll packages error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/packages/:id - Get package detail by ID
 */
export const getPackageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const data = await (prisma as any).package.findFirst({
      where: { id, trash: null },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            customer_name: true
          }
        }
      }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      });
      return;
    }

    // Parse service list for easier consumption
    const serviceIds = parseServiceList(data.listService);
    const responseData = {
      ...data,
      serviceIds
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('getPackageById error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch package',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/packages - Create new package
 */
export const createPackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      name,
      description,
      total_price,
      promotion_from,
      promotion_to,
      percent_discount,
      serviceIds, // Array of service IDs
      customer_id,
      group
    } = req.body;

    // Validate required fields
    if (!code || !name) {
      res.status(400).json({
        success: false,
        message: 'Code and name are required'
      });
      return;
    }

    // Validate service list
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one service is required'
      });
      return;
    }

    // Check if code already exists
    const existingCode = await checkDuplicateCaseInsensitive(
      (prisma as any).package,
      'code',
      code
    );
    if (existingCode) {
      res.status(409).json({
        success: false,
        message: 'Code already exists'
      });
      return;
    }

    // Check if name already exists
    const existingName = await checkDuplicateCaseInsensitive(
      (prisma as any).package,
      'name',
      name
    );
    if (existingName) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    const createdBy = (req as any).user?.id || null;

    // Parse dates from d-m-Y format
    let promotionFromDate: Date | null = null;
    let promotionToDate: Date | null = null;

    if (promotion_from) {
      promotionFromDate = parseDateDMY(promotion_from);
      if (!promotionFromDate) {
        res.status(400).json({
          success: false,
          message: 'Invalid promotion_from date format. Expected d-m-Y format (e.g., 01-01-2024)'
        });
        return;
      }
    }

    if (promotion_to) {
      promotionToDate = parseDateDMY(promotion_to);
      if (!promotionToDate) {
        res.status(400).json({
          success: false,
          message: 'Invalid promotion_to date format. Expected d-m-Y format (e.g., 31-12-2024)'
        });
        return;
      }
    }

    // Calculate total price if group is not 1
    let finalTotalPrice = total_price;
    const isGroup = group === 1 || group === '1';
    
    if (!isGroup) {
      try {
        finalTotalPrice = await calculateTotalPrice(serviceIds, prisma);
      } catch (error) {
        console.error('Error calculating total price:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to calculate total price from services'
        });
        return;
      }
    }

    if (finalTotalPrice === null || finalTotalPrice === undefined) {
      res.status(400).json({
        success: false,
        message: 'Total price is required when group=1, or services must exist when group=0'
      });
      return;
    }

    // Format service list
    const listService = formatServiceList(serviceIds);

    // Create package using transaction
    const data = await prisma.$transaction(async (tx: any) => {
      return await (tx as any).package.create({
        data: {
          code: code.trim(),
          name: name.trim(),
          description: description?.trim() || null,
          totalPrice: finalTotalPrice,
          promotionFrom: promotionFromDate,
          promotionTo: promotionToDate,
          percentDiscount: percent_discount || 0,
          listService,
          customerId: customer_id || null,
          group: isGroup ? 1 : 0,
          createdBy
        },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data
    });
  } catch (error) {
    console.error('createPackage error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle Prisma unique constraint errors
    if (errorMessage.includes('Unique constraint') || errorMessage.includes('code')) {
      res.status(409).json({
        success: false,
        message: 'Code already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create package',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/packages/:id - Update package
 */
export const updatePackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if package exists
    const existingPackage = await (prisma as any).package.findFirst({
      where: { id, trash: null }
    });

    if (!existingPackage) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      });
      return;
    }

    const {
      code,
      name,
      description,
      total_price,
      promotion_from,
      promotion_to,
      percent_discount,
      serviceIds,
      customer_id,
      group
    } = req.body;

    // Check if code is being changed and if it already exists
    if (code && code !== existingPackage.code) {
      const codeExists = await checkDuplicateCaseInsensitive(
        (prisma as any).package,
        'code',
        code,
        id
      );
      if (codeExists) {
        res.status(409).json({
          success: false,
          message: 'Code already exists'
        });
        return;
      }
    }

    // Check if name is being changed and if it already exists
    if (name && name !== existingPackage.name) {
      const nameExists = await checkDuplicateCaseInsensitive(
        (prisma as any).package,
        'name',
        name,
        id
      );
      if (nameExists) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    // Build update data
    const updateData: any = {};

    if (code !== undefined) updateData.code = code.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (percent_discount !== undefined) updateData.percentDiscount = percent_discount;
    if (customer_id !== undefined) updateData.customerId = customer_id || null;

    // Parse dates from d-m-Y format
    if (promotion_from !== undefined) {
      if (promotion_from === null || promotion_from === '') {
        updateData.promotionFrom = null;
      } else {
        const parsedDate = parseDateDMY(promotion_from);
        if (!parsedDate) {
          res.status(400).json({
            success: false,
            message: 'Invalid promotion_from date format. Expected d-m-Y format (e.g., 01-01-2024)'
          });
          return;
        }
        updateData.promotionFrom = parsedDate;
      }
    }

    if (promotion_to !== undefined) {
      if (promotion_to === null || promotion_to === '') {
        updateData.promotionTo = null;
      } else {
        const parsedDate = parseDateDMY(promotion_to);
        if (!parsedDate) {
          res.status(400).json({
            success: false,
            message: 'Invalid promotion_to date format. Expected d-m-Y format (e.g., 31-12-2024)'
          });
          return;
        }
        updateData.promotionTo = parsedDate;
      }
    }

    // Handle service list update
    if (serviceIds !== undefined) {
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'At least one service is required'
        });
        return;
      }
      updateData.listService = formatServiceList(serviceIds);
    }

    // Handle group flag
    const isGroup = group === 1 || group === '1' || (group === undefined && existingPackage.group === 1);
    if (group !== undefined) {
      updateData.group = isGroup ? 1 : 0;
    }

    // Recalculate total price if group is not 1 and services changed
    if (!isGroup) {
      const serviceIdsToUse = serviceIds !== undefined ? serviceIds : parseServiceList(existingPackage.listService);
      
      if (serviceIdsToUse.length > 0) {
        try {
          const calculatedPrice = await calculateTotalPrice(serviceIdsToUse, prisma);
          updateData.totalPrice = calculatedPrice;
        } catch (error) {
          console.error('Error calculating total price:', error);
          res.status(500).json({
            success: false,
            message: 'Failed to calculate total price from services'
          });
          return;
        }
      } else {
        res.status(400).json({
          success: false,
          message: 'Cannot calculate price: no services provided'
        });
        return;
      }
    } else if (total_price !== undefined) {
      // If group=1, use manual total_price
      updateData.totalPrice = total_price;
    }

    // Set updated_by if user is authenticated
    if ((req as any).user?.id) {
      updateData.updatedBy = (req as any).user.id;
    }

    // Update package
    const data = await (prisma as any).package.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            customer_name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Package updated successfully',
      data
    });
  } catch (error) {
    console.error('updatePackage error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle Prisma unique constraint errors
    if (errorMessage.includes('Unique constraint') || errorMessage.includes('code')) {
      res.status(409).json({
        success: false,
        message: 'Code already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update package',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/packages/:id - Delete package (soft delete)
 */
export const deletePackage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if package exists
    const existingPackage = await (prisma as any).package.findFirst({
      where: { id, trash: null }
    });

    if (!existingPackage) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      });
      return;
    }

    // Soft delete
    await (prisma as any).package.update({
      where: { id },
      data: { trash: 1 }
    });

    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('deletePackage error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete package',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/packages/json - JSON API with contract pricing support
 * Query params: q (search), group (filter group packages), contract_id (apply pricing), dataTable (use 'data' key), pretty (pretty print)
 */
export const getPackagesJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const groupOnly = parseBooleanParam(req.query.group as string | string[] | undefined);
    const contractId = parseId(req.query.contract_id as string | undefined);
    const dataTable = parseBooleanParam(req.query.dataTable as string | string[] | undefined);
    const limit = dataTable ? undefined : 20; // No limit for dataTable mode

    // Build where condition
    const where: any = {
      trash: null,
      ...buildMultiFieldSearchCondition(['name', 'code'], search),
    };

    if (groupOnly) {
      where.group = 1;
    }

    // Load packages with eager loading
    const packages = await (prisma as any).package.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            customer_name: true
          }
        }
      }
    });

    // Parse service IDs for each package
    const packagesWithServices = packages.map((pkg: any) => ({
      ...pkg,
      serviceIds: parseServiceList(pkg.listService)
    }));

    // Collect all service IDs
    const allServiceIds: number[] = packagesWithServices.flatMap((pkg: any) => pkg.serviceIds);
    const allPackageIds = packages.map((pkg: any) => pkg.id);

    // Load contract pricing if contract_id provided
    let contractPricing: Map<string, any> | null = null;
    let contract: any = null;

    if (contractId) {
      contract = await (prisma as any).contract.findFirst({
        where: {
          id: contractId,
          deletedAt: null
        },
        include: {
          details: true
        }
      });

      if (contract) {
        // Check if contract is active
        const now = new Date();
        if (contract.periodFrom <= now && contract.periodTo >= now) {
          contractPricing = await getBatchPricing(
            contract.customerId,
            allServiceIds,
            allPackageIds
          );
        }
      }
    }

    // Load all services with relations in batch
    const serviceIdsSet = new Set(allServiceIds);
    const uniqueServiceIds = Array.from(serviceIdsSet);

    const services = uniqueServiceIds.length > 0 ? await (prisma as any).service.findMany({
      where: {
        id: { in: uniqueServiceIds },
        trash: null
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        parameter: {
          select: {
            id: true,
            name: true
          }
        },
        method: {
          select: {
            id: true,
            name: true,
            matrix: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }) : [];

    // Create service map for quick lookup
    const serviceMap = new Map(services.map((s: any) => [s.id, s]));

    // Transform packages to JSON response format
    const items = packagesWithServices.map((pkg: any) => {
      const packageServices = pkg.serviceIds
        .map((serviceId: number) => serviceMap.get(serviceId))
        .filter((s: any): s is NonNullable<typeof s> => s !== undefined)
        .map((service: any) => {
          // Get service pricing from contract if available
          const servicePricingKey = `service:${service.id}`;
          const servicePricing = contractPricing?.get(servicePricingKey);

          // Calculate service price with discount
          let servicePrice = service.price;
          let serviceDiscount = 0;
          let urgentCharge = 50;
          let veryUrgentCharge = 100;

          if (servicePricing) {
            serviceDiscount = servicePricing.discount || 0;
            urgentCharge = servicePricing.urgentCharge || 50;
            veryUrgentCharge = servicePricing.veryUrgentCharge || 100;
          }

          const discountedPrice = servicePrice * (1 - serviceDiscount / 100);

          return {
            id: service.id,
            name: service.name,
            code: service.code,
            category: service.category ? {
              id: service.category.id,
              name: service.category.name
            } : null,
            parameter: service.parameter ? {
              id: service.parameter.id,
              name: service.parameter.name
            } : null,
            method: service.method ? {
              id: service.method.id,
              name: service.method.name
            } : null,
            matrix: service.method?.matrix?.name || null,
            unit: service.unit || null,
            accreditation: {
              name: service.accreditation || null,
              'valid-date': service.accreditation_valid_date || null
            },
            lod: service.lod || null,
            loq: service.loq || null,
            profiency: service.proficiency_test || null,
            description: service.description || null,
            price: {
              value: Math.round(discountedPrice),
              currency: 'IDR',
              discount: serviceDiscount
            },
            'priority-charge': {
              urgent: urgentCharge,
              'very-urgent': veryUrgentCharge
            }
          };
        });

      // Get package pricing from contract if available
      const packagePricingKey = `package:${pkg.id}`;
      const packagePricing = contractPricing?.get(packagePricingKey);

      // Calculate package total price
      const basePrice = pkg.totalPrice || 0;
      let packageDiscount = pkg.percentDiscount || 0;
      let packageUrgentCharge = 50;
      let packageVeryUrgentCharge = 100;

      if (packagePricing) {
        packageDiscount = packagePricing.discount || packageDiscount;
        packageUrgentCharge = packagePricing.urgentCharge || 50;
        packageVeryUrgentCharge = packagePricing.veryUrgentCharge || 100;
      }

      const discountedPrice = basePrice * (1 - packageDiscount / 100);

      return {
        id: pkg.id,
        name: pkg.name,
        code: pkg.code,
        description: pkg.description || null,
        price: {
          value: Math.round(discountedPrice),
          currency: 'IDR',
          discount: packageDiscount
        },
        'priority-charge': {
          urgent: packageUrgentCharge,
          'very-urgent': packageVeryUrgentCharge
        },
        group: pkg.group || 0,
        services: packageServices
      };
    });

    const response: any = {
      total_count: items.length,
      incomplete_results: false
    };

    // Use 'data' key if dataTable=true, otherwise 'items'
    if (dataTable) {
      response.data = items;
    } else {
      response.items = items;
    }

    // Pretty print if requested
    if (parseBooleanParam(req.query.pretty as string | string[] | undefined)) {
      res.setHeader('Content-Type', 'application/json');
      res.json(JSON.stringify(response, null, 2));
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('getPackagesJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
