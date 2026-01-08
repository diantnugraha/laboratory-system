import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, sanitizeSearchQuery, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';
import { ContractStatusService } from '@prisma/client';

/**
 * Helper function to parse date from d-m-Y or ISO format
 */
function parseDate(dateString: string | undefined): Date | null {
  if (!dateString) return null;
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  
  // Try d-m-Y format (DD-MM-YYYY)
  const dmyMatch = dateString.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try other formats
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Helper function to format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Validate no overlapping contracts for same customer
 */
async function validateNoOverlap(
  customerId: number,
  periodFrom: Date,
  periodTo: Date,
  excludeId?: number
): Promise<{ valid: boolean; message?: string }> {
  const overlapping = await prisma.contract.findFirst({
    where: {
      customerId,
      deletedAt: null,
      ...(excludeId && { id: { not: excludeId } }),
      OR: [
        // New contract starts during existing
        { periodFrom: { lte: periodFrom }, periodTo: { gte: periodFrom } },
        // New contract ends during existing
        { periodFrom: { lte: periodTo }, periodTo: { gte: periodTo } },
        // New contract contains existing
        { periodFrom: { gte: periodFrom }, periodTo: { lte: periodTo } },
      ],
    },
  });

  if (overlapping) {
    return {
      valid: false,
      message: `Contract overlaps with existing contract ${overlapping.code} (${formatDate(overlapping.periodFrom)} - ${formatDate(overlapping.periodTo)})`,
    };
  }

  return { valid: true };
}

/**
 * GET /api/contracts - List contracts with search, pagination, and filters
 */
export const getContracts = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseQueryParam(req.query.limit, 20), 100);
    const offset = parseQueryParam(req.query.offset, 0);
    const searchQuery = sanitizeSearchQuery((req.query.search || req.query.q) as string | undefined);

    const where: any = {
      deletedAt: null,
      ...buildSearchCondition('code', searchQuery),
    };

    // Customer role restrictions: if current user is a Customer, restrict to their customer_id
    if ((req as any).user?.role_id === 16 && (req as any).user?.customer_id) {
      where.customerId = (req as any).user.customer_id;
    }

    // Optional customer filter
    if (req.query.customer_id) {
      const customerId = parseId(req.query.customer_id as string);
      if (customerId) {
        where.customerId = customerId;
      }
    }

    // Optional date range filters
    if (req.query.period_to_start) {
      const startDate = parseDate(req.query.period_to_start as string);
      if (startDate) {
        where.periodTo = { ...where.periodTo, gte: startDate };
      }
    }

    if (req.query.period_to_end) {
      const endDate = parseDate(req.query.period_to_end as string);
      if (endDate) {
        where.periodTo = { ...where.periodTo, lte: endDate };
      }
    }

    // Priority filter (1=special customer, 2=normal customer)
    if (req.query.priority) {
      const priority = parseQueryParam(req.query.priority, 0);
      if (priority === 1) {
        where.customer = { special_customer: 1 };
      } else if (priority === 2) {
        where.customer = { special_customer: { not: 1 } };
      }
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        orderBy: {
          id: 'desc',
        },
        take: limit,
        skip: offset,
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
              special_customer: true,
              top: true,
            },
          },
          details: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: contracts,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Get contracts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contracts',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/contracts/:id - Get contract detail by ID
 */
export const getContractById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID',
      });
      return;
    }

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            customer_name: true,
            business: true,
            email: true,
            special_customer: true,
            top: true,
          },
        },
        details: {
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      res.status(404).json({
        success: false,
        message: 'Contract not found',
      });
      return;
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Get contract by ID error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contract',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/contracts/customer - Get customer's latest active contract
 */
export const getCustomerContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.customer_id) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Customer role required.',
      });
      return;
    }

    const now = new Date();
    const contract = await prisma.contract.findFirst({
      where: {
        customerId: user.customer_id,
        deletedAt: null,
        periodFrom: { lte: now },
        periodTo: { gte: now },
      },
      orderBy: {
        id: 'desc',
      },
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            customer_name: true,
          },
        },
        details: {
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      res.status(404).json({
        success: false,
        message: 'No active contract found',
      });
      return;
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Get customer contract error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer contract',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/contracts - Create new contract
 */
export const createContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const createdBy = user?.id || 1;

    const {
      code,
      customer_id,
      period,
      periode_from,
      periode_to,
      period_from,
      period_to,
      period_alias,
      normal_day,
      urgent_day,
      very_urgent_day,
      status_service,
      discount,
      dsc_urgent,
      dsc_very_urgent,
      promotion_id,
      remarks,
      services,
      packages,
    } = req.body;

    // Validate required fields
    if (!code || !customer_id || !period) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: code, customer_id, period',
      });
      return;
    }

    // Parse dates (support both periode_from/to and period_from/to)
    const periodFrom = parseDate(periode_from || period_from);
    const periodTo = parseDate(periode_to || period_to);

    if (!periodFrom || !periodTo) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY',
      });
      return;
    }

    if (periodFrom > periodTo) {
      res.status(400).json({
        success: false,
        message: 'period_from must be less than or equal to period_to',
      });
      return;
    }

    // Validate required lead time fields
    if (!normal_day || !urgent_day || !very_urgent_day) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: normal_day, urgent_day, very_urgent_day',
      });
      return;
    }

    // Validate status_service
    const statusService = status_service === 'selected' ? ContractStatusService.SELECTED : ContractStatusService.ALL;

    // Validate unique code (case-insensitive)
    const existingCode = await checkDuplicateCaseInsensitive(
      prisma.contract,
      'code',
      code,
      { deletedAt: null }
    );

    if (existingCode) {
      res.status(409).json({
        success: false,
        message: 'Contract code already exists',
      });
      return;
    }

    // Validate no overlapping contracts
    const overlapCheck = await validateNoOverlap(
      parseInt(customer_id),
      periodFrom,
      periodTo
    );

    if (!overlapCheck.valid) {
      res.status(409).json({
        success: false,
        message: overlapCheck.message,
      });
      return;
    }

    // Handle documents (file uploads would be handled here)
    // For now, support JSON array or string with ;; separator
    let documents: string[] | null = null;
    if (req.body.contract_document) {
      if (typeof req.body.contract_document === 'string') {
        // Legacy format: "file1.pdf;;file2.pdf"
        documents = req.body.contract_document.split(';;').filter(Boolean);
      } else if (Array.isArray(req.body.contract_document)) {
        documents = req.body.contract_document;
      }
    }

    // Create contract with transaction
    const result = await prisma.$transaction(async (tx) => {
      const contractData: any = {
        code: code.trim(),
        customerId: parseInt(customer_id),
        period,
        periodFrom,
        periodTo,
        periodAlias: period_alias || null,
        documents: documents ? JSON.stringify(documents) : null,
        normalDay: parseInt(normal_day),
        urgentDay: parseInt(urgent_day),
        veryUrgentDay: parseInt(very_urgent_day),
        statusService,
        discount: discount ? parseFloat(discount) : 0,
        discountUrgent: dsc_urgent ? parseInt(dsc_urgent) : 50,
        discountVeryUrgent: dsc_very_urgent ? parseInt(dsc_very_urgent) : 100,
        promotionId: promotion_id ? parseInt(promotion_id) : null,
        remarks: remarks || null,
        createdBy,
      };

      // If SELECTED mode, create details
      if (statusService === ContractStatusService.SELECTED) {
        const detailsToCreate: any[] = [];

        // Process services
        if (services && Array.isArray(services)) {
          for (const service of services) {
            if (service.service_id) {
              detailsToCreate.push({
                serviceId: parseInt(service.service_id),
                discountNormal: service.discount ? parseFloat(service.discount) : 0,
                discountUrgent: service['pc-urgent'] ? parseInt(service['pc-urgent']) : 50,
                discountVeryUrgent: service['pc-very-urgent'] ? parseInt(service['pc-very-urgent']) : 100,
              });
            }
          }
        }

        // Process packages
        if (packages && Array.isArray(packages)) {
          for (const pkg of packages) {
            if (pkg.package_id) {
              detailsToCreate.push({
                packageId: parseInt(pkg.package_id),
                discountNormal: pkg.discount ? parseFloat(pkg.discount) : 0,
                discountUrgent: pkg['pc-urgent'] ? parseInt(pkg['pc-urgent']) : 50,
                discountVeryUrgent: pkg['pc-very-urgent'] ? parseInt(pkg['pc-very-urgent']) : 100,
              });
            }
          }
        }

        contractData.details = {
          create: detailsToCreate,
        };
      }

      const contract = await tx.contract.create({
        data: contractData,
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
          details: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return contract;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Contract created successfully',
    });
  } catch (error) {
    console.error('Create contract error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create contract',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PUT /api/contracts/:id - Update contract
 */
export const updateContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID',
      });
      return;
    }

    const user = (req as any).user;
    const updatedBy = user?.id || 1;

    // Check if delete is requested
    if (req.body.delete === true || req.body.delete === 'true') {
      await prisma.contract.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedBy,
        },
      });

      res.json({
        success: true,
        message: 'Contract deleted successfully',
      });
      return;
    }

    // Load existing contract
    const existing = await prisma.contract.findUnique({
      where: { id },
      include: { details: true },
    });

    if (!existing || existing.deletedAt) {
      res.status(404).json({
        success: false,
        message: 'Contract not found',
      });
      return;
    }

    const {
      code,
      customer_id,
      period,
      periode_from,
      periode_to,
      period_from,
      period_to,
      period_alias,
      normal_day,
      urgent_day,
      very_urgent_day,
      status_service,
      discount,
      dsc_urgent,
      dsc_very_urgent,
      promotion_id,
      remarks,
      services,
      packages,
    } = req.body;

    // Validate unique code if changed
    if (code && code !== existing.code) {
      const existingCode = await checkDuplicateCaseInsensitive(
        prisma.contract,
        'code',
        code,
        { deletedAt: null, id: { not: id } }
      );

      if (existingCode) {
        res.status(409).json({
          success: false,
          message: 'Contract code already exists',
        });
        return;
      }
    }

    // Parse dates if provided
    let periodFrom = existing.periodFrom;
    let periodTo = existing.periodTo;

    if (periode_from || period_from) {
      const parsed = parseDate(periode_from || period_from);
      if (parsed) periodFrom = parsed;
    }

    if (periode_to || period_to) {
      const parsed = parseDate(periode_to || period_to);
      if (parsed) periodTo = parsed;
    }

    if (periodFrom > periodTo) {
      res.status(400).json({
        success: false,
        message: 'period_from must be less than or equal to period_to',
      });
      return;
    }

    // Validate no overlap if dates changed
    if (periodFrom !== existing.periodFrom || periodTo !== existing.periodTo) {
      const overlapCheck = await validateNoOverlap(
        customer_id ? parseInt(customer_id) : existing.customerId,
        periodFrom,
        periodTo,
        id
      );

      if (!overlapCheck.valid) {
        res.status(409).json({
          success: false,
          message: overlapCheck.message,
        });
        return;
      }
    }

    // Determine status service
    const statusService = status_service
      ? status_service === 'selected'
        ? ContractStatusService.SELECTED
        : ContractStatusService.ALL
      : existing.statusService;

    // Handle documents
    let documents: string[] | null = null;
    if (req.body.contract_document !== undefined) {
      if (typeof req.body.contract_document === 'string') {
        documents = req.body.contract_document.split(';;').filter(Boolean);
      } else if (Array.isArray(req.body.contract_document)) {
        documents = req.body.contract_document;
      } else if (req.body.contract_document === null) {
        documents = null;
      }
    } else {
      // Keep existing documents
      if (existing.documents) {
        try {
          documents = JSON.parse(existing.documents as string);
        } catch {
          documents = null;
        }
      }
    }

    // Update with transaction
    const result = await prisma.$transaction(async (tx) => {
      // If switching from SELECTED to ALL, delete all details
      if (
        statusService === ContractStatusService.ALL &&
        existing.statusService === ContractStatusService.SELECTED
      ) {
        await tx.contractDetail.deleteMany({
          where: { contractId: id },
        });
      }

      // Update contract
      const updateData: any = {
        updatedBy,
      };

      if (code !== undefined) updateData.code = code.trim();
      if (customer_id !== undefined) updateData.customerId = parseInt(customer_id);
      if (period !== undefined) updateData.period = period;
      if (periodFrom !== existing.periodFrom) updateData.periodFrom = periodFrom;
      if (periodTo !== existing.periodTo) updateData.periodTo = periodTo;
      if (period_alias !== undefined) updateData.periodAlias = period_alias || null;
      if (documents !== undefined) updateData.documents = documents ? JSON.stringify(documents) : null;
      if (normal_day !== undefined) updateData.normalDay = parseInt(normal_day);
      if (urgent_day !== undefined) updateData.urgentDay = parseInt(urgent_day);
      if (very_urgent_day !== undefined) updateData.veryUrgentDay = parseInt(very_urgent_day);
      if (status_service !== undefined) updateData.statusService = statusService;
      if (discount !== undefined) updateData.discount = discount ? parseFloat(discount) : 0;
      if (dsc_urgent !== undefined) updateData.discountUrgent = dsc_urgent ? parseInt(dsc_urgent) : 50;
      if (dsc_very_urgent !== undefined) updateData.discountVeryUrgent = dsc_very_urgent ? parseInt(dsc_very_urgent) : 100;
      if (promotion_id !== undefined) updateData.promotionId = promotion_id ? parseInt(promotion_id) : null;
      if (remarks !== undefined) updateData.remarks = remarks || null;

      await tx.contract.update({
        where: { id },
        data: updateData,
      });

      // Handle details if SELECTED mode
      if (statusService === ContractStatusService.SELECTED) {
        const existingDetailIds = new Set(existing.details.map((d) => d.id));

        // Upsert service details
        if (services && Array.isArray(services)) {
          for (const service of services) {
            if (service.service_id) {
              const serviceId = parseInt(service.service_id);
              const detail = await tx.contractDetail.upsert({
                where: {
                  contractId_serviceId: {
                    contractId: id,
                    serviceId,
                  },
                },
                update: {
                  discountNormal: service.discount ? parseFloat(service.discount) : 0,
                  discountUrgent: service['pc-urgent'] ? parseInt(service['pc-urgent']) : 50,
                  discountVeryUrgent: service['pc-very-urgent'] ? parseInt(service['pc-very-urgent']) : 100,
                },
                create: {
                  contractId: id,
                  serviceId,
                  discountNormal: service.discount ? parseFloat(service.discount) : 0,
                  discountUrgent: service['pc-urgent'] ? parseInt(service['pc-urgent']) : 50,
                  discountVeryUrgent: service['pc-very-urgent'] ? parseInt(service['pc-very-urgent']) : 100,
                },
              });
              existingDetailIds.delete(detail.id);
            }
          }
        }

        // Upsert package details
        if (packages && Array.isArray(packages)) {
          for (const pkg of packages) {
            if (pkg.package_id) {
              const packageId = parseInt(pkg.package_id);
              const detail = await tx.contractDetail.upsert({
                where: {
                  contractId_packageId: {
                    contractId: id,
                    packageId,
                  },
                },
                update: {
                  discountNormal: pkg.discount ? parseFloat(pkg.discount) : 0,
                  discountUrgent: pkg['pc-urgent'] ? parseInt(pkg['pc-urgent']) : 50,
                  discountVeryUrgent: pkg['pc-very-urgent'] ? parseInt(pkg['pc-very-urgent']) : 100,
                },
                create: {
                  contractId: id,
                  packageId,
                  discountNormal: pkg.discount ? parseFloat(pkg.discount) : 0,
                  discountUrgent: pkg['pc-urgent'] ? parseInt(pkg['pc-urgent']) : 50,
                  discountVeryUrgent: pkg['pc-very-urgent'] ? parseInt(pkg['pc-very-urgent']) : 100,
                },
              });
              existingDetailIds.delete(detail.id);
            }
          }
        }

        // Delete orphaned details
        if (existingDetailIds.size > 0) {
          await tx.contractDetail.deleteMany({
            where: {
              id: { in: Array.from(existingDetailIds) },
            },
          });
        }
      }

      // Return updated contract
      return tx.contract.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
          details: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    res.json({
      success: true,
      data: result,
      message: 'Contract updated successfully',
    });
  } catch (error) {
    console.error('Update contract error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update contract',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * DELETE /api/contracts/:id - Soft delete contract
 */
export const deleteContract = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID',
      });
      return;
    }

    const user = (req as any).user;
    const updatedBy = user?.id || 1;

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract || contract.deletedAt) {
      res.status(404).json({
        success: false,
        message: 'Contract not found',
      });
      return;
    }

    await prisma.contract.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy,
      },
    });

    res.json({
      success: true,
      message: 'Contract deleted successfully',
    });
  } catch (error) {
    console.error('Delete contract error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete contract',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/contracts/json - Get contracts as JSON (for autocomplete/search)
 */
export const getContractsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchQuery = sanitizeSearchQuery((req.query.q as string) || '');
    const useDataTable = req.query.dataTable === 'true' || req.query.dataTable === '1';
    const pretty = req.query.pretty === 'true' || req.query.pretty === '1';

    const where: any = {
      deletedAt: null,
    };

    // Search by customer name
    if (searchQuery) {
      where.customer = {
        customer_name: {
          contains: searchQuery
        },
      };
    }

    const contracts = await prisma.contract.findMany({
      where,
      take: 50, // Limit for autocomplete
      orderBy: {
        id: 'desc',
      },
      include: {
        customer: {
          select: {
            id: true,
            customer_name: true,
          },
        },
      },
    });

    const items = contracts.map((contract) => ({
      id: contract.id,
      name: contract.code,
      customer: {
        id: contract.customer.id,
        name: contract.customer.customer_name,
      },
      periode_from: formatDate(contract.periodFrom),
      periode_to: formatDate(contract.periodTo),
    }));

    const response: any = {
      total_count: items.length,
      incomplete_results: false,
    };

    if (useDataTable) {
      response.data = items;
    } else {
      response.items = items;
    }

    if (pretty) {
      res.setHeader('Content-Type', 'application/json');
      res.json(JSON.stringify(response, null, 2));
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('Get contracts JSON error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contracts',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/contracts/fetch-json - Fetch contracts with advanced filters
 */
export const getContractsFetchJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const perPage = Math.min(parseQueryParam(req.query.per_page, 20), 100);
    const page = parseQueryParam(req.query.page, 1);
    const skip = (page - 1) * perPage;

    const where: any = {
      deletedAt: null,
      periodTo: { gte: now }, // Only active contracts
    };

    // Customer role filter
    const user = (req as any).user;
    if (user?.role_id === 16 && user?.customer_id) {
      where.customerId = user.customer_id;
    }

    // Query filters
    if (req.query.customer_id) {
      const customerId = parseId(req.query.customer_id as string);
      if (customerId) {
        where.customerId = customerId;
      }
    }

    // Priority filter (1=special customer, 2=normal customer)
    if (req.query.priority) {
      const priority = parseQueryParam(req.query.priority, 0);
      if (priority === 1) {
        where.customer = { special_customer: 1 };
      } else if (priority === 2) {
        where.customer = { special_customer: { not: 1 } };
      }
    }

    // Date range filters
    if (req.query.periode_to_start) {
      const startDate = parseDate(req.query.periode_to_start as string);
      if (startDate) {
        where.periodTo = { ...where.periodTo, gte: startDate };
      }
    }

    if (req.query.periode_to_end) {
      const endDate = parseDate(req.query.periode_to_end as string);
      if (endDate) {
        where.periodTo = { ...where.periodTo, lte: endDate };
      }
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take: perPage,
        orderBy: {
          id: 'desc',
        },
        include: {
          customer: {
            select: {
              id: true,
              customer_name: true,
              special_customer: true,
              top: true,
            },
          },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    const items = contracts.map((contract) => ({
      id: contract.id,
      code: contract.code,
      period_from: formatDate(contract.periodFrom),
      period_to: formatDate(contract.periodTo),
      customer: {
        id: contract.customer.id,
        name: contract.customer.customer_name,
        top_value: contract.customer.top,
      },
      white_list: contract.customer.special_customer === 1,
      top: contract.customer.top !== null && contract.customer.top !== 0,
    }));

    res.json({
      total_count: total,
      items,
    });
  } catch (error) {
    console.error('Get contracts fetch JSON error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contracts',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

