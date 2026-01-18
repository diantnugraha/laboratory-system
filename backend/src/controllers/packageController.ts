import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { PackageRepository } from '../repositories/implementations/PackageRepository.js';
import { parseId, parseQueryParam, parseBooleanParam, ApiResponse } from '../types/index.js';
import { parseServiceList, formatServiceList, calculateTotalPrice, parseDateDMY } from '../utils/packageHelper.js';
import { getBatchPricing } from '../utils/contractPricingHelper.js';

// Initialize repository
const packageRepo = new PackageRepository(prisma);

/**
 * Generate auto-incrementing package code (PKG-0001, PKG-0002, etc.)
 */
async function generatePackageCode(): Promise<string> {
  const lastPackage = await (prisma as any).package.findFirst({
    where: { trash: null },
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastPackage?.code) {
    const match = lastPackage.code.match(/PKG-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `PKG-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * GET /api/packages - List with search & pagination
 * Supports query parameter ?select=true for dropdown/select options
 */
export const getAllPackages = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const isSelect = parseBooleanParam((request.query as any).select as string | string[] | undefined);
    const page = parseQueryParam((request.query as any).page, 1);
    const limit = parseQueryParam((request.query as any).limit, 20);
    const search = typeof (request.query as any).search === 'string' ? (request.query as any).search : undefined;

    // Call repository
    const result = await packageRepo.findAll({ search, page, limit, select: isSelect });

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const data = result.getValue();

    // Select mode returns array directly, standard mode returns paginated data
    if (isSelect) {
      return reply.send({
        success: true,
        data
      });
    } else {
      const response: ApiResponse = {
        success: true,
        data: data.data,
        pagination: data.pagination,
      };
      return reply.send(response);
    }
  } catch (error) {
    console.error('getAll packages error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch packages',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/packages/:id - Get package detail by ID
 */
export const getPackageById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Call repository
    const result = await packageRepo.findById(id);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: result.error,
      });
    }

    const data = result.getValue();

    // Parse service list for easier consumption
    const serviceIds = parseServiceList(data.listService);
    console.log('[DEBUG GET] listService from DB:', data.listService);
    console.log('[DEBUG GET] parsed serviceIds:', serviceIds);

    // Fetch service details
    let services: any[] = [];
    if (serviceIds.length > 0) {
      const fetchedServices = await (prisma as any).service.findMany({
        where: {
          id: { in: serviceIds },
          trash: null,
        },
        select: {
          id: true,
          code: true,
          name: true,
          price: true,
          parameter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Sort services to match the order stored in listService
      const serviceMap = new Map(fetchedServices.map((s: any) => [s.id, s]));
      services = serviceIds
        .map(id => serviceMap.get(id))
        .filter((s): s is any => s !== undefined);
    }

    const responseData = {
      ...data,
      serviceIds,
      services,
    };

    return reply.send({ success: true, data: responseData });
  } catch (error) {
    console.error('getPackageById error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch package',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/packages - Create new package
 */
export const createPackage = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
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
    } = request.body as any;

    // Validate required fields
    if (!name) {
      return reply.code(400).send({
        success: false,
        message: 'Name is required'
      });
    }

    // Auto-generate code if not provided
    const finalCode = code || await generatePackageCode();

    // Validate service list
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return reply.code(400).send({
        success: false,
        message: 'At least one service is required'
      });
    }

    // Check if code already exists via repository (returns boolean)
    const codeResult = await packageRepo.findByCode(finalCode);
    if (codeResult.isSuccess() && codeResult.getValue() === true) {
      return reply.code(409).send({
        success: false,
        message: 'Code already exists'
      });
    }

    // Check if name already exists via repository (returns boolean)
    const nameResult = await packageRepo.findByName(name);
    if (nameResult.isSuccess() && nameResult.getValue() === true) {
      return reply.code(409).send({
        success: false,
        message: 'Name already exists'
      });
    }

    const createdBy = (request as any).user?.id || null;

    // Parse dates from d-m-Y format
    let promotionFromDate: Date | null = null;
    let promotionToDate: Date | null = null;

    if (promotion_from) {
      promotionFromDate = parseDateDMY(promotion_from);
      if (!promotionFromDate) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid promotion_from date format. Expected d-m-Y format (e.g., 01-01-2024)'
        });
      }
    }

    if (promotion_to) {
      promotionToDate = parseDateDMY(promotion_to);
      if (!promotionToDate) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid promotion_to date format. Expected d-m-Y format (e.g., 31-12-2024)'
        });
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
        return reply.code(500).send({
          success: false,
          message: 'Failed to calculate total price from services'
        });
      }
    }

    if (finalTotalPrice === null || finalTotalPrice === undefined) {
      return reply.code(400).send({
        success: false,
        message: 'Total price is required when group=1, or services must exist when group=0'
      });
    }

    // Format service list
    const listService = formatServiceList(serviceIds);

    // Create package via repository
    const result = await packageRepo.create({
      code: finalCode.trim(),
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
    });

    if (result.isFailure()) {
      // Handle Prisma unique constraint errors
      const errorMsg = result.error || 'Unknown error';
      if (errorMsg.includes('Unique constraint') || errorMsg.includes('code')) {
        return reply.code(409).send({
          success: false,
          message: 'Code already exists'
        });
      }

      return reply.code(500).send({
        success: false,
        message: errorMsg,
      });
    }

    return reply.code(201).send({
      success: true,
      message: 'Package created successfully',
      data: result.getValue(),
    });
  } catch (error) {
    console.error('createPackage error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle Prisma unique constraint errors
    if (errorMessage.includes('Unique constraint') || errorMessage.includes('code')) {
      return reply.code(409).send({
        success: false,
        message: 'Code already exists'
      });
    }

    return reply.code(500).send({
      success: false,
      message: 'Failed to create package',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/packages/:id - Update package
 */
export const updatePackage = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if package exists via repository
    const existingResult = await packageRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Package not found',
      });
    }

    const existingPackage = existingResult.getValue();

    console.log('[DEBUG UPDATE] request.body:', request.body);

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
    } = request.body as any;

    console.log('[DEBUG UPDATE] extracted serviceIds:', serviceIds);

    // Check if code is being changed and if it already exists
    // Use case-insensitive comparison to detect actual changes
    if (code && code.trim().toLowerCase() !== existingPackage.code?.toLowerCase()) {
      const codeResult = await packageRepo.findByCode(code.trim(), id);
      if (codeResult.isSuccess() && codeResult.getValue() === true) {
        return reply.code(409).send({
          success: false,
          message: 'Code already exists'
        });
      }
    }

    // Check if name is being changed and if it already exists
    // Use case-insensitive comparison to detect actual changes
    if (name && name.trim().toLowerCase() !== existingPackage.name?.toLowerCase()) {
      const nameResult = await packageRepo.findByName(name.trim(), id);
      if (nameResult.isSuccess() && nameResult.getValue() === true) {
        return reply.code(409).send({
          success: false,
          message: 'Name already exists'
        });
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
          return reply.code(400).send({
            success: false,
            message: 'Invalid promotion_from date format. Expected d-m-Y format (e.g., 01-01-2024)'
          });
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
          return reply.code(400).send({
            success: false,
            message: 'Invalid promotion_to date format. Expected d-m-Y format (e.g., 31-12-2024)'
          });
        }
        updateData.promotionTo = parsedDate;
      }
    }

    // Handle service list update
    if (serviceIds !== undefined) {
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return reply.code(400).send({
          success: false,
          message: 'At least one service is required'
        });
      }
      const formattedList = formatServiceList(serviceIds);
      console.log('[DEBUG UPDATE] serviceIds received:', serviceIds);
      console.log('[DEBUG UPDATE] formatted listService:', formattedList);
      updateData.listService = formattedList;
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
          return reply.code(500).send({
            success: false,
            message: 'Failed to calculate total price from services'
          });
        }
      } else {
        return reply.code(400).send({
          success: false,
          message: 'Cannot calculate price: no services provided'
        });
      }
    } else if (total_price !== undefined) {
      // If group=1, use manual total_price
      updateData.totalPrice = total_price;
    }

    // Set updated_by if user is authenticated
    if ((request as any).user?.id) {
      updateData.updatedBy = (request as any).user.id;
    }

    // Update package via repository
    const result = await packageRepo.update(id, updateData);

    if (result.isFailure()) {
      // Handle Prisma unique constraint errors
      const errorMsg = result.error || 'Unknown error';
      if (errorMsg.includes('Unique constraint') || errorMsg.includes('code')) {
        return reply.code(409).send({
          success: false,
          message: 'Code already exists'
        });
      }

      return reply.code(500).send({
        success: false,
        message: errorMsg,
      });
    }

    return reply.send({
      success: true,
      message: 'Package updated successfully',
      data: result.getValue(),
    });
  } catch (error) {
    console.error('updatePackage error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle Prisma unique constraint errors
    if (errorMessage.includes('Unique constraint') || errorMessage.includes('code')) {
      return reply.code(409).send({
        success: false,
        message: 'Code already exists'
      });
    }

    return reply.code(500).send({
      success: false,
      message: 'Failed to update package',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/packages/:id - Delete package (soft delete)
 */
export const deletePackage = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if package exists via repository
    const existingResult = await packageRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Package not found',
      });
    }

    // Delete via repository
    const result = await packageRepo.delete(id);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('deletePackage error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
export const getPackagesJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const search = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;
    const groupOnly = parseBooleanParam((request.query as any).group as string | string[] | undefined);
    const contractId = parseId((request.query as any).contract_id as string | undefined);
    const dataTable = parseBooleanParam((request.query as any).dataTable as string | string[] | undefined);
    const limit = dataTable ? undefined : 20; // No limit for dataTable mode

    // Load packages via repository
    const result = await packageRepo.findForJson({
      search,
      groupOnly,
      limit,
    });

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const packages = result.getValue();

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
          trash: null
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
    if (parseBooleanParam((request.query as any).pretty as string | string[] | undefined)) {
      reply.header('Content-Type', 'application/json');
      return reply.send(JSON.stringify(response, null, 2));
    } else {
      return reply.send(response);
    }
  } catch (error) {
    console.error('getPackagesJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch packages JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
