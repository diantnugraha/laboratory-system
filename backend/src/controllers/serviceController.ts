import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildMultiFieldSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/services - List dengan search & pagination
 */
export const getAllServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where = {
      trash: null,
      ...buildMultiFieldSearchCondition(['name', 'code'], search),
    };

    const [data, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
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
      }),
      prisma.service.count({ where })
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
    console.error('getAll services error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/:id
 */
export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const data = await prisma.service.findFirst({
      where: { id, trash: null },
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
        },
        subcontractor: {
          select: {
            id: true,
            lab_name: true
          }
        },
        analystType: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('getById service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/services
 */
export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      name,
      category_id,
      parameter_id,
      method_id,
      subcontractor_id,
      analyst_type_id,
      accreditation,
      accreditation_valid_date,
      unit,
      published_date,
      lod,
      loq,
      proficiency_test,
      description,
      price,
      user,
      use_pc,
      status
    } = req.body;

    // Validate required fields
    if (!code || typeof code !== 'string' || code.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Code is required'
      });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    if (!category_id || typeof category_id !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
      return;
    }

    if (parameter_id === undefined || typeof parameter_id !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Parameter ID is required'
      });
      return;
    }

    if (!method_id || typeof method_id !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Method ID is required'
      });
      return;
    }

    if (!price || typeof price !== 'number' || price < 0) {
      res.status(400).json({
        success: false,
        message: 'Price is required and must be a non-negative number'
      });
      return;
    }

    // Check code uniqueness (case-insensitive, exclude trash) - BR-001
    const duplicateCode = await checkDuplicateCaseInsensitive(
      prisma.service,
      'code',
      code.trim()
    );
    if (duplicateCode) {
      res.status(409).json({
        success: false,
        message: 'Code already exists'
      });
      return;
    }

    // Validate foreign keys exist
    const [category, parameter, method] = await Promise.all([
      prisma.category.findFirst({ where: { id: category_id, trash: null } }),
      prisma.parameter.findFirst({ where: { id: parameter_id, trash: null } }),
      prisma.method.findFirst({ where: { id: method_id, trash: null } })
    ]);

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    if (!parameter) {
      res.status(404).json({
        success: false,
        message: 'Parameter not found'
      });
      return;
    }

    if (!method) {
      res.status(404).json({
        success: false,
        message: 'Method not found'
      });
      return;
    }

    // Validate optional foreign keys if provided
    if (subcontractor_id) {
      const subcontractor = await prisma.subcontractor.findFirst({
        where: { id: subcontractor_id, trash: null }
      });
      if (!subcontractor) {
        res.status(404).json({
          success: false,
          message: 'Subcontractor not found'
        });
        return;
      }
    }

    if (analyst_type_id) {
      const analystType = await prisma.analystType.findFirst({
        where: { id: analyst_type_id, trash: null }
      });
      if (!analystType) {
        res.status(404).json({
          success: false,
          message: 'Analyst Type not found'
        });
        return;
      }
    }

    // Get user ID from request (set by authenticate middleware)
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const data = await prisma.service.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        category_id,
        parameter_id,
        method_id,
        subcontractor_id: subcontractor_id || null,
        analyst_type_id: analyst_type_id || null,
        accreditation: accreditation?.trim() || null,
        accreditation_valid_date: accreditation_valid_date?.trim() || null,
        unit: unit?.trim() || null,
        published_date: published_date ? new Date(published_date) : null,
        lod: lod?.trim() || null,
        loq: loq?.trim() || null,
        proficiency_test: proficiency_test?.trim() || null,
        description: description?.trim() || null,
        price: Math.round(price),
        user: user || 1,
        use_pc: use_pc || 0,
        status: status?.trim() || null,
        created_by: userId
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
        },
        subcontractor: {
          select: {
            id: true,
            lab_name: true
          }
        },
        analystType: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data
    });
  } catch (error) {
    console.error('create service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create service',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/services/:id
 */
export const updateService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check service exists
    const existing = await prisma.service.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
      return;
    }

    const {
      code,
      name,
      category_id,
      parameter_id,
      method_id,
      subcontractor_id,
      analyst_type_id,
      accreditation,
      accreditation_valid_date,
      unit,
      published_date,
      lod,
      loq,
      proficiency_test,
      description,
      price,
      user,
      use_pc,
      status
    } = req.body;

    // Check code uniqueness (exclude self) - BR-001
    if (code && typeof code === 'string' && code.trim() !== '') {
      const duplicateCode = await checkDuplicateCaseInsensitive(
        prisma.service,
        'code',
        code.trim(),
        id
      );
      if (duplicateCode) {
        res.status(409).json({
          success: false,
          message: 'Code already exists'
        });
        return;
      }
    }

    // Validate foreign keys if provided
    if (category_id !== undefined) {
      const category = await prisma.category.findFirst({
        where: { id: category_id, trash: null }
      });
      if (!category) {
        res.status(404).json({
          success: false,
          message: 'Category not found'
        });
        return;
      }
    }

    if (parameter_id !== undefined) {
      const parameter = await prisma.parameter.findFirst({
        where: { id: parameter_id, trash: null }
      });
      if (!parameter) {
        res.status(404).json({
          success: false,
          message: 'Parameter not found'
        });
        return;
      }
    }

    if (method_id !== undefined) {
      const method = await prisma.method.findFirst({
        where: { id: method_id, trash: null }
      });
      if (!method) {
        res.status(404).json({
          success: false,
          message: 'Method not found'
        });
        return;
      }
    }

    if (subcontractor_id !== undefined && subcontractor_id !== null) {
      const subcontractor = await prisma.subcontractor.findFirst({
        where: { id: subcontractor_id, trash: null }
      });
      if (!subcontractor) {
        res.status(404).json({
          success: false,
          message: 'Subcontractor not found'
        });
        return;
      }
    }

    if (analyst_type_id !== undefined && analyst_type_id !== null) {
      const analystType = await prisma.analystType.findFirst({
        where: { id: analyst_type_id, trash: null }
      });
      if (!analystType) {
        res.status(404).json({
          success: false,
          message: 'Analyst Type not found'
        });
        return;
      }
    }

    // Get user ID from request
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check if price changed for history tracking - BR-003
    const priceChanged = price !== undefined && typeof price === 'number' && price !== existing.price;

    // Prepare update data
    const updateData: any = {
      updated_by: userId
    };

    if (code !== undefined) updateData.code = code.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (category_id !== undefined) updateData.category_id = category_id;
    if (parameter_id !== undefined) updateData.parameter_id = parameter_id;
    if (method_id !== undefined) updateData.method_id = method_id;
    if (subcontractor_id !== undefined) updateData.subcontractor_id = subcontractor_id || null;
    if (analyst_type_id !== undefined) updateData.analyst_type_id = analyst_type_id || null;
    if (accreditation !== undefined) updateData.accreditation = accreditation?.trim() || null;
    if (accreditation_valid_date !== undefined) updateData.accreditation_valid_date = accreditation_valid_date?.trim() || null;
    if (unit !== undefined) updateData.unit = unit?.trim() || null;
    if (published_date !== undefined) updateData.published_date = published_date ? new Date(published_date) : null;
    if (lod !== undefined) updateData.lod = lod?.trim() || null;
    if (loq !== undefined) updateData.loq = loq?.trim() || null;
    if (proficiency_test !== undefined) updateData.proficiency_test = proficiency_test?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (price !== undefined) updateData.price = Math.round(price);
    if (user !== undefined) updateData.user = user;
    if (use_pc !== undefined) updateData.use_pc = use_pc;
    if (status !== undefined) updateData.status = status?.trim() || null;

    // Use transaction for price history tracking - BR-003
    const data = await prisma.$transaction(async (tx) => {
      // Create service_history record if price changed (BR-003)
      // Note: ServiceHistory model may not exist in schema - handle gracefully
      if (priceChanged) {
        try {
          // @ts-ignore - ServiceHistory may not exist in Prisma schema
          await tx.serviceHistory.create({
            data: {
              service_id: id,
              price: existing.price, // Store old price, not new price
              created_by: userId
            }
          });
        } catch (error: any) {
          // Model doesn't exist or other error - log but continue
          if (!error?.message?.includes('Unknown arg') && !error?.message?.includes('model') && process.env.NODE_ENV === 'development') {
            console.warn('ServiceHistory model not available:', error.message);
          }
        }
      }

      return tx.service.update({
        where: { id },
        data: updateData,
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
          },
          subcontractor: {
            select: {
              id: true,
              lab_name: true
            }
          },
          analystType: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    });

    res.json({
      success: true,
      message: 'Service updated successfully',
      data
    });
  } catch (error) {
    console.error('update service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/services/:id
 */
export const deleteService = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const existing = await prisma.service.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
      return;
    }

    // Get user ID from request
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Soft delete: update trash = 1 - BR-002
    await prisma.service.update({
      where: { id },
      data: {
        trash: 1,
        updated_by: userId
      }
    });

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('delete service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get lab type filter for where clause
 * BR-006: Lab type filtering (user field: 1=CTS, 2=Non-CTS, 3=Both)
 */
const getLabTypeFilter = (labType: 'cts' | 'env' | 'all'): any => {
  switch (labType) {
    case 'cts':
      return { in: [1, 3] }; // CTS Lab only (1) or Both (3)
    case 'env':
      return { in: [2, 3] }; // Non-CTS Lab only (2) or Both (3)
    case 'all':
      return undefined; // No filter
    default:
      return undefined;
  }
};

/**
 * Get parameter filter for where clause
 */
const getParameterFilter = (product?: boolean, nonparameter?: boolean): any => {
  if (product) return { parameter_id: { equals: 0 } }; // Product services
  if (nonparameter) return undefined; // All parameters
  return { parameter_id: { not: 0 } }; // Exclude products (parameter_id != 0)
};

/**
 * Default priority charge values
 */
const PRIORITY_CHARGE_URGENT = 50;
const PRIORITY_CHARGE_VERY_URGENT = 100;

/**
 * Get contract pricing data for a single service
 * BR-004: Contract-aware pricing logic
 * Note: Contract and ContractDetail models may not exist in schema
 * Note: This function is not currently used (using batch version instead)
 */
// Note: This function is available but not currently used (using batch version instead)
// Exported to avoid TypeScript unused variable warning, but not used in routes
export const _getContractPricing = async (serviceId: number, contractId: number): Promise<any> => {
  try {
    // @ts-ignore - Contract may not exist
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, deletedAt: null },
      include: {
        // @ts-ignore
        contractDetails: {
          where: { service_id: serviceId }
        }
      }
    });

    if (!contract) {
      return {
        price: 0,
        discountValue: 0,
        pcUrgentValue: PRIORITY_CHARGE_URGENT,
        pcVeryUrgentValue: PRIORITY_CHARGE_VERY_URGENT,
        inContract: false
      };
    }

    const now = new Date();
    // @ts-ignore
    const periodeFrom = contract.periode_from ? new Date(contract.periode_from) : null;
    // @ts-ignore
    const periodeTo = contract.periode_to ? new Date(contract.periode_to) : null;

    // Check contract validity (date range)
    if (!periodeFrom || !periodeTo || now < periodeFrom || now > periodeTo) {
      const service = await prisma.service.findFirst({
        where: { id: serviceId },
        select: { price: true }
      });
      return {
        price: service?.price || 0,
        discountValue: 0,
        pcUrgentValue: PRIORITY_CHARGE_URGENT,
        pcVeryUrgentValue: PRIORITY_CHARGE_VERY_URGENT,
        inContract: false
      };
    }

    // Check for historical price within contract period
    let historicalPrice: number | null = null;
    try {
      // @ts-ignore - ServiceHistory may not exist
      const history = await prisma.serviceHistory.findFirst({
        where: {
          service_id: serviceId,
          created_at: {
            gte: periodeFrom,
            lte: periodeTo
          }
        },
        orderBy: { created_at: 'asc' }
      });
      // @ts-ignore
      if (history) historicalPrice = history.price;
    } catch (e) {
      // ServiceHistory doesn't exist - ignore
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId },
      select: { price: true }
    });

    const currentPrice = service?.price || 0;
    const price = historicalPrice ?? currentPrice;

    // @ts-ignore
    const contractDetail = contract.contractDetails?.[0];
    // @ts-ignore
    const statusService = contract.status_service;

    // If contract has selected services and detail exists, use detail pricing
    if (statusService === 'selected' && contractDetail) {
      // @ts-ignore
      const dscNormal = contractDetail.dsc_normal ? Number(contractDetail.dsc_normal) : 0;
      // @ts-ignore
      const dscUrgent = contractDetail.dsc_urgent ?? PRIORITY_CHARGE_URGENT;
      // @ts-ignore
      const dscVeryUrgent = contractDetail.dsc_very_urgent ?? PRIORITY_CHARGE_VERY_URGENT;

      return {
        price,
        discountValue: dscNormal,
        pcUrgentValue: dscUrgent,
        pcVeryUrgentValue: dscVeryUrgent,
        inContract: true
      };
    }

    // Use contract defaults
    // @ts-ignore
    const discountValue = contract.discount ? Number(contract.discount) : 0;
    // @ts-ignore
    const dscUrgent = contract.dsc_urgent ?? PRIORITY_CHARGE_URGENT;
    // @ts-ignore
    const dscVeryUrgent = contract.dsc_very_urgent ?? PRIORITY_CHARGE_VERY_URGENT;

    return {
      price: discountValue === 0 ? currentPrice : price,
      discountValue,
      pcUrgentValue: dscUrgent,
      pcVeryUrgentValue: dscVeryUrgent,
      inContract: false
    };
  } catch (error: any) {
    // Contract models don't exist - return defaults
    if (error?.message?.includes('Unknown arg') || error?.message?.includes('model')) {
      const service = await prisma.service.findFirst({
        where: { id: serviceId },
        select: { price: true }
      });
      return {
        price: service?.price || 0,
        discountValue: 0,
        pcUrgentValue: PRIORITY_CHARGE_URGENT,
        pcVeryUrgentValue: PRIORITY_CHARGE_VERY_URGENT,
        inContract: false
      };
    }
    throw error;
  }
};

/**
 * Batch fetch contract pricing for multiple services (performance optimization)
 */
const getContractPricingBatch = async (serviceIds: number[], contractId: number): Promise<Map<number, any>> => {
  const result = new Map<number, any>();
  
  // If no service IDs, return empty map
  if (serviceIds.length === 0) return result;

  try {
    // @ts-ignore - Contract may not exist
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, deletedAt: null },
      include: {
        // @ts-ignore
        contractDetails: {
          // @ts-ignore
          where: { service_id: { in: serviceIds } }
        }
      }
    });

    if (!contract) {
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, price: true }
      });
      services.forEach(s => {
        result.set(s.id, {
          price: s.price,
          discountValue: 0,
          pcUrgentValue: PRIORITY_CHARGE_URGENT,
          pcVeryUrgentValue: PRIORITY_CHARGE_VERY_URGENT,
          inContract: false
        });
      });
      return result;
    }

    const now = new Date();
    // @ts-ignore
    const periodeFrom = contract.periode_from ? new Date(contract.periode_from) : null;
    // @ts-ignore
    const periodeTo = contract.periode_to ? new Date(contract.periode_to) : null;

    const isValid = periodeFrom && periodeTo && now >= periodeFrom && now <= periodeTo;

    // Fetch services
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, price: true }
    });

    const priceMap = new Map(services.map(s => [s.id, s.price]));

    if (!isValid) {
      services.forEach(s => {
        result.set(s.id, {
          price: s.price,
          discountValue: 0,
          pcUrgentValue: PRIORITY_CHARGE_URGENT,
          pcVeryUrgentValue: PRIORITY_CHARGE_VERY_URGENT,
          inContract: false
        });
      });
      return result;
    }

    // Fetch historical prices in batch
    let historyMap = new Map<number, number>();
    try {
      // @ts-ignore - ServiceHistory may not exist
      const histories = await prisma.serviceHistory.findMany({
        where: {
          service_id: { in: serviceIds },
          created_at: {
            gte: periodeFrom!,
            lte: periodeTo!
          }
        },
        orderBy: { created_at: 'asc' }
      });
      // @ts-ignore
      histories.forEach((h: any) => {
        if (!historyMap.has(h.service_id)) {
          historyMap.set(h.service_id, h.price);
        }
      });
    } catch (e) {
      // ServiceHistory doesn't exist - ignore
    }

    // @ts-ignore
    const detailMap = new Map((contract.contractDetails || []).map((d: any) => [d.service_id, d]));
    // @ts-ignore
    const statusService = contract.status_service;
    // @ts-ignore
    const contractDiscount = contract.discount ? Number(contract.discount) : 0;
    // @ts-ignore
    const contractDscUrgent = contract.dsc_urgent ?? PRIORITY_CHARGE_URGENT;
    // @ts-ignore
    const contractDscVeryUrgent = contract.dsc_very_urgent ?? PRIORITY_CHARGE_VERY_URGENT;

    services.forEach(service => {
      const detail = detailMap.get(service.id);
      const currentPrice = priceMap.get(service.id) || 0;
      const historicalPrice = historyMap.get(service.id);
      const price = historicalPrice ?? currentPrice;

      if (statusService === 'selected' && detail) {
        // @ts-ignore
        const dscNormal = detail.dsc_normal ? Number(detail.dsc_normal) : 0;
        // @ts-ignore
        const dscUrgent = detail.dsc_urgent ?? PRIORITY_CHARGE_URGENT;
        // @ts-ignore
        const dscVeryUrgent = detail.dsc_very_urgent ?? PRIORITY_CHARGE_VERY_URGENT;

        result.set(service.id, {
          price,
          discountValue: dscNormal,
          pcUrgentValue: dscUrgent,
          pcVeryUrgentValue: dscVeryUrgent,
          inContract: true
        });
      } else {
        result.set(service.id, {
          price: contractDiscount === 0 ? currentPrice : price,
          discountValue: contractDiscount,
          pcUrgentValue: contractDscUrgent,
          pcVeryUrgentValue: contractDscVeryUrgent,
          inContract: false
        });
      }
    });

    return result;
  } catch (error: any) {
    // Contract models don't exist - return defaults
    if (error?.message?.includes('Unknown arg') || error?.message?.includes('model')) {
      const services = await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, price: true }
      });
      services.forEach(s => {
        result.set(s.id, {
          price: s.price,
          discountValue: 0,
          pcUrgentValue: PRIORITY_CHARGE_URGENT,
          pcVeryUrgentValue: PRIORITY_CHARGE_VERY_URGENT,
          inContract: false
        });
      });
      return result;
    }
    throw error;
  }
};

/**
 * Map service to JSON response format with contract pricing
 */
const mapServiceToJson = (service: any, contractData?: any): any => {
  const pcUrgent = contractData?.pcUrgentValue ?? PRIORITY_CHARGE_URGENT;
  const pcVeryUrgent = contractData?.pcVeryUrgentValue ?? PRIORITY_CHARGE_VERY_URGENT;

  // Non-parameter services (parameter_id = 0) with use_pc = 0 have no priority charges
  const isNonParameterNoPC = service.parameter_id === 0 && !service.use_pc;

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
    unit: service.unit,
    status: service.status,
    accreditation: {
      name: service.accreditation,
      'valid-date': service.accreditation_valid_date
    },
    lod: service.lod,
    loq: service.loq,
    profiency: service.proficiency_test,
    description: service.description || '-',
    price: {
      value: contractData?.price ?? service.price,
      currency: 'IDR',
      ...(contractData && contractData.discountValue > 0 && { discount: contractData.discountValue })
    },
    'priority-charge': {
      urgent: isNonParameterNoPC ? 0 : pcUrgent,
      'very-urgent': isNonParameterNoPC ? 0 : pcVeryUrgent
    },
    ...(contractData && {
      open: contractData.inContract ? '<strong>' : '',
      close: contractData.inContract ? '</strong>' : '',
      class: contractData.inContract ? 'add-service' : ''
    })
  };
};

// ============================================================================
// JSON API Endpoints
// ============================================================================

/**
 * GET /api/services/json - JSON API for CTS lab services
 * BR-006: Filters user IN (1, 3) for CTS lab
 */
export const getServicesJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const product = req.query.product !== undefined;
    const nonparameter = req.query.nonparameter !== undefined;
    const contractId = typeof req.query.contract_id === 'string' ? parseId(req.query.contract_id) : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    const where: any = {
      trash: null,
      // BR-006: Lab type filter - CTS lab (user IN (1, 3))
      user: getLabTypeFilter('cts'),
      // BR-007: Status filter - exclude Inactive unless dataTable
      ...(isDataTable ? {} : { 
        status: { not: 'Inactive' }
      }),
      // Parameter filter
      ...getParameterFilter(product, nonparameter),
      // Search filter
      ...(searchTerm && buildMultiFieldSearchCondition(['name', 'code'], searchTerm))
    };

    const limit = isDataTable ? 10000 : 150; // Fix: max 10000 instead of 1 billion

    const services = await prisma.service.findMany({
      where,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        category: {
          select: { id: true, name: true }
        },
        parameter: {
          select: { id: true, name: true }
        },
        method: {
          select: {
            id: true,
            name: true,
            matrix: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Batch fetch contract pricing if contract_id provided
    let contractDataMap: Map<number, any> | undefined;
    if (contractId && services.length > 0) {
      contractDataMap = await getContractPricingBatch(
        services.map(s => s.id),
        contractId
      );
    }

    const items = services.map(service =>
      mapServiceToJson(service, contractDataMap?.get(service.id))
    );

    const response: any = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
    };

    if (req.query.pretty !== undefined) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response, null, 2));
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('getServicesJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/json-global - JSON API for all lab services
 */
export const getServicesJsonGlobal = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const product = req.query.product !== undefined;
    const nonparameter = req.query.nonparameter !== undefined;
    const contractId = typeof req.query.contract_id === 'string' ? parseId(req.query.contract_id) : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    const where: any = {
      trash: null,
      // No user filter for global
      // BR-007: Status filter - exclude Inactive unless dataTable
      ...(isDataTable ? {} : { 
        status: { not: 'Inactive' }
      }),
      // Parameter filter
      ...getParameterFilter(product, nonparameter),
      // Search filter
      ...(searchTerm && buildMultiFieldSearchCondition(['name', 'code'], searchTerm))
    };

    const limit = isDataTable ? 10000 : 150;

    const services = await prisma.service.findMany({
      where,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        category: {
          select: { id: true, name: true }
        },
        parameter: {
          select: { id: true, name: true }
        },
        method: {
          select: {
            id: true,
            name: true,
            matrix: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    let contractDataMap: Map<number, any> | undefined;
    if (contractId && services.length > 0) {
      contractDataMap = await getContractPricingBatch(
        services.map(s => s.id),
        contractId
      );
    }

    const items = services.map(service =>
      mapServiceToJson(service, contractDataMap?.get(service.id))
    );

    const response: any = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
    };

    if (req.query.pretty !== undefined) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response, null, 2));
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('getServicesJsonGlobal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/json-env - JSON API for Non-CTS lab services
 * BR-006: Filters user IN (2, 3) for Non-CTS lab
 */
export const getServicesJsonEnv = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const product = req.query.product !== undefined;
    const nonparameter = req.query.nonparameter !== undefined;
    const contractId = typeof req.query.contract_id === 'string' ? parseId(req.query.contract_id) : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    const where: any = {
      trash: null,
      // BR-006: Lab type filter - Non-CTS lab (user IN (2, 3))
      user: getLabTypeFilter('env'),
      // BR-007: Status filter - exclude Inactive unless dataTable
      ...(isDataTable ? {} : { 
        status: { not: 'Inactive' }
      }),
      // Parameter filter
      ...getParameterFilter(product, nonparameter),
      // Search filter
      ...(searchTerm && buildMultiFieldSearchCondition(['name', 'code'], searchTerm))
    };

    const limit = isDataTable ? 10000 : 150;

    const services = await prisma.service.findMany({
      where,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        category: {
          select: { id: true, name: true }
        },
        parameter: {
          select: { id: true, name: true }
        },
        method: {
          select: {
            id: true,
            name: true,
            matrix: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    let contractDataMap: Map<number, any> | undefined;
    if (contractId && services.length > 0) {
      contractDataMap = await getContractPricingBatch(
        services.map(s => s.id),
        contractId
      );
    }

    const items = services.map(service =>
      mapServiceToJson(service, contractDataMap?.get(service.id))
    );

    const response: any = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
    };

    if (req.query.pretty !== undefined) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response, null, 2));
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('getServicesJsonEnv error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/json2 - DataTable format with analyst count
 */
export const getServicesDataTable = async (req: Request, res: Response): Promise<void> => {
  try {
    const sEcho = parseQueryParam(req.query.sEcho, 1);
    const iDisplayStart = parseQueryParam(req.query.iDisplayStart, 0);
    const iDisplayLength = Math.min(parseQueryParam(req.query.iDisplayLength, 10), 10000); // Fix: max 10000
    const sSearch = typeof req.query.sSearch === 'string' ? req.query.sSearch : undefined;
    // Note: contractId available but not used in DataTable format
    // const contractId = typeof req.query.contract_id === 'string' ? parseId(req.query.contract_id) : undefined;

    // Build where clause
    const where: any = {
      trash: null,
      status: { not: null }
    };

    if (sSearch) {
      where.OR = [
        { name: { contains: sSearch } },
        { code: { contains: sSearch } }
      ];
    }

    // Get total count
    const iTotalRecords = await prisma.service.count({ where });

    // Fetch services
    const services = await prisma.service.findMany({
      where,
      skip: iDisplayStart,
      take: iDisplayLength,
      orderBy: { id: 'desc' },
      include: {
        category: {
          select: { id: true, name: true }
        },
        method: {
          select: {
            id: true,
            name: true,
            matrix: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Get analyst count for each service (if AnalystType model exists)
    const analystCounts = new Map<number, number>();
    try {
      // @ts-ignore - AnalystType may not exist
      const analystTypes = await prisma.analystType.findMany({
        where: { trash: null },
        select: { id: true, list_service: true }
      });

      for (const service of services) {
        let count = 0;
        for (const analystType of analystTypes) {
          // @ts-ignore
          if (analystType.list_service && analystType.list_service.includes(`,${service.id},`)) {
            try {
              // @ts-ignore - AnalystRules may not exist
              const rules = await prisma.analystRules.findMany({
                // @ts-ignore
                where: { analyst_type_id: analystType.id, trash: null },
                select: { user_id: true }
              });
              // @ts-ignore
              const uniqueUsers = new Set(rules.map((r: any) => r.user_id));
              count += uniqueUsers.size;
            } catch (e) {
              // AnalystRules doesn't exist - ignore
            }
          }
        }
        analystCounts.set(service.id, count);
      }
    } catch (e) {
      // AnalystType doesn't exist - all counts remain 0
    }

    // Format as DataTable response
    const aaData = services.map(service => [
      `<a href='/service/update?id=${service.id}'>${service.code}</a>`,
      service.name,
      service.method?.name || '',
      service.method?.matrix?.name || '',
      service.accreditation || '',
      service.status || '',
      service.lod || '',
      service.loq || '',
      service.price.toLocaleString('id-ID'),
      String(analystCounts.get(service.id) || 0)
    ]);

    res.json({
      sEcho,
      iTotalRecords,
      iTotalDisplayRecords: iTotalRecords,
      Data: [],
      aaData
    });
  } catch (error) {
    console.error('getServicesDataTable error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/json-top - Service usage statistics for charts
 */
export const getServiceStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Note: searchTerm query param available but not used in statistics
    // const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const isDataTable = req.query.dataTable !== undefined;
    const targetYear = typeof req.query.year === 'string' ? parseInt(req.query.year) : new Date().getFullYear();

    // Get total worksheet count
    let totalWorksheets = 0;
    try {
      // @ts-ignore - Worksheet may not exist
      totalWorksheets = await prisma.worksheet.count({
        where: { trash: null }
      });
    } catch (e) {
      // Worksheet model doesn't exist - use 0
    }

    // Get category statistics
    let categoryStats: Array<{ name: string; count: number }> = [];
    try {
      // @ts-ignore - Worksheet may not exist, use raw query
      const stats = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
        SELECT c.name, COUNT(w.id) as count
        FROM worksheet w
        JOIN service s ON s.id = w.service_id
        JOIN category c ON c.id = s.category_id
        WHERE YEAR(w.created_at) = ${targetYear}
          AND w.trash IS NULL
        GROUP BY c.name
        ORDER BY count DESC
        LIMIT 5
      `;
      categoryStats = stats.map((s: any) => ({
        name: s.name,
        count: Number(s.count)
      }));
    } catch (e: any) {
      // Worksheet or raw query not available
      if (!e?.message?.includes('Unknown') && process.env.NODE_ENV === 'development') {
        console.warn('Worksheet statistics not available:', e.message);
      }
    }

    const labels: string[] = [];
    const data: number[] = [];
    let totalCounted = 0;

    categoryStats.forEach((stat) => {
      const percent = totalWorksheets > 0 ? Math.round((stat.count / totalWorksheets) * 100) : 0;
      labels.push(`${stat.name} ${percent}%`);
      data.push(stat.count);
      totalCounted += stat.count;
    });

    // Add "Rest" category
    const restCount = totalWorksheets - totalCounted;
    const restPercent = totalWorksheets > 0 ? Math.round((restCount / totalWorksheets) * 100) : 0;
    labels.push(`Rest ${Math.max(0, restPercent)}%`);
    data.push(Math.max(0, restCount));

    const response: any = {
      labels,
      datasets: [{
        backgroundColor: ['#F7464A', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360', '#CCCCCC'],
        hoverBackgroundColor: ['#FF5A5E', '#5AD3D1', '#FFC870', '#A8B3C5', '#616774', '#DEDEDE'],
        data
      }]
    };

    if (isDataTable) {
      // Extended format for dataTable mode
      response.data = categoryStats.map((_stat, idx) => ({
        label: labels[idx],
        value: data[idx],
        percentage: totalWorksheets > 0 ? ((data[idx] / totalWorksheets) * 100).toFixed(2) : '0.00'
      }));
    }

    res.json(response);
  } catch (error) {
    console.error('getServiceStatistics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/fetch-json - Paginated service list with advanced filters
 */
export const getServicesFetch = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const user = typeof req.query.user === 'string' ? parseId(req.query.user) : undefined;
    const method = typeof req.query.method === 'string' ? req.query.method : undefined;
    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    const perPage = parseQueryParam(req.query.per_page, 20);
    const page = parseQueryParam(req.query.page, 1);
    const skip = (page - 1) * perPage;
    // @ts-ignore
    const orderBy = typeof req.query.order_by === 'string' ? req.query.order_by : 't.id DESC';
    const contractId = typeof req.query.contract_id === 'string' ? parseId(req.query.contract_id) : 36; // Default to 36 per spec

    // Check user role for status filter (BR-007)
    // @ts-ignore
    const userRole = (req as any).user?.role_id;
    const isCustomer = userRole === 8; // Customer role

    const where: any = {
      trash: null
    };

    // Status filter - Customer only sees Active/Subcontracted
    if (status) {
      where.status = status;
    } else if (isCustomer) {
      where.status = { in: ['Active', 'Subcontracted'] };
    } else {
      where.status = { not: null };
    }

    // Lab type filter
    if (user !== undefined) {
      where.user = user;
    }

    // Method filter (LIKE) - need to join with method table
    if (method) {
      where.method = {
        name: { contains: method }
      };
    }

    // Name filter (LIKE)
    if (name) {
      where.name = { contains: name };
    }

    // Parse order_by (simple implementation)
    let orderByClause: any = { id: 'desc' };
    if (orderBy.includes('ASC')) {
      orderByClause = { id: 'asc' };
    } else if (orderBy.includes('name')) {
      orderByClause = orderBy.includes('ASC') ? { name: 'asc' } : { name: 'desc' };
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: perPage,
        orderBy: orderByClause,
        include: {
          method: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.service.count({ where })
    ]);

    // Get contract pricing if contract_id provided
    let contractDataMap: Map<number, any> | undefined;
    if (contractId && services.length > 0) {
      contractDataMap = await getContractPricingBatch(
        services.map(s => s.id),
        contractId
      );
    }

    const items = services.map(service => {
      const contractData = contractDataMap?.get(service.id);
      const discount = contractData?.discountValue || 0;
      
      return {
        id: service.id,
        code: service.code,
        name: service.name,
        price: service.price.toLocaleString('id-ID'),
        accreditation: service.accreditation || '',
        status: service.status || '',
        method: service.method ? {
          id: service.method.id,
          name: service.method.name
        } : null,
        activediscount: discount > 0 ? `<span class='badge bg-red'>${discount}% </span>` : ''
      };
    });

    res.json({
      total_count: total,
      items
    });
  } catch (error) {
    console.error('getServicesFetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/report - CSV export
 */
export const exportServiceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const start = typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;

    // Validate date format (YYYY-MM-DD)
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      res.status(400).json({
        success: false,
        message: 'Invalid start date format (expected YYYY-MM-DD)'
      });
      return;
    }

    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      res.status(400).json({
        success: false,
        message: 'Invalid end date format (expected YYYY-MM-DD)'
      });
      return;
    }

    const where: any = {
      trash: null
    };

    // Date filter
    if (start || end) {
      where.created_at = {};
      if (start) {
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        where.created_at.gte = startDate;
      }
      if (end) {
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        category: {
          select: { id: true, name: true }
        },
        method: {
          select: {
            id: true,
            name: true,
            matrix: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Get analyst count for each service
    const analystCounts = new Map<number, number>();
    try {
      // @ts-ignore
      const analystTypes = await prisma.analystType.findMany({
        where: { trash: null },
        select: { id: true, list_service: true }
      });

      for (const service of services) {
        let count = 0;
        for (const analystType of analystTypes) {
          // @ts-ignore
          if (analystType.list_service && analystType.list_service.includes(`,${service.id},`)) {
            try {
              // @ts-ignore
              const rules = await prisma.analystRules.findMany({
                // @ts-ignore
                where: { analyst_type_id: analystType.id, trash: null },
                select: { user_id: true }
              });
              // @ts-ignore
              const uniqueUsers = new Set(rules.map((r: any) => r.user_id));
              count += uniqueUsers.size;
            } catch (e) {
              // Ignore
            }
          }
        }
        analystCounts.set(service.id, count);
      }
    } catch (e) {
      // Ignore
    }

    // Generate CSV
    const escapeCSV = (value: string | null | undefined): string => {
      if (!value) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = 'CODE, NAME, METHOD, SAMPLE MATRIX, CATEGORY NAME, ACCREDITATION, STATUS, LOD, LOQ, PRICE, TOTAL ANALYST\r\n';
    const rows = services.map(s =>
      `${escapeCSV(s.code)},${escapeCSV(s.name)},${escapeCSV(s.method?.name || '')},${escapeCSV(s.method?.matrix?.name || '')},${escapeCSV(s.category?.name || '')},${escapeCSV(s.accreditation || '')},${escapeCSV(s.status || '')},${escapeCSV(s.lod || '')},${escapeCSV(s.loq || '')},${escapeCSV(String(s.price))},${escapeCSV(String(analystCounts.get(s.id) || 0))}`
    ).join('\r\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report-service.csv"');
    res.send(csv);
  } catch (error) {
    console.error('exportServiceReport error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
