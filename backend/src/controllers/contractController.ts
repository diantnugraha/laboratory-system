import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { sanitizeSearchQuery } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';
import { ContractRepository } from '../repositories/implementations/ContractRepository';
import { ContractDetailDTO } from '../repositories/contracts/IContractRepository';

// Initialize repository
const contractRepository = new ContractRepository(prisma);

/**
 * Generate contract code with format CON.00000
 * Finds the highest existing CON.XXXXX code and increments from there
 */
async function generateContractCode(): Promise<string> {
  // Find the contract with highest CON.XXXXX code using ORDER BY DESC
  const lastContract = await prisma.contract.findFirst({
    where: {
      code: {
        startsWith: 'CON.',
      },
    },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastContract?.code) {
    const match = lastContract.code.match(/CON\.(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `CON.${String(nextNumber).padStart(5, '0')}`;
}

/**
 * GET /api/contracts/generate-code - Generate next contract code
 */
export const getGenerateCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = await generateContractCode();
    res.json({
      success: true,
      data: { code },
    });
  } catch (error) {
    console.error('Generate contract code error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to generate contract code',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

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
 * Helper to convert status_service string to lowercase string
 */
function parseStatusService(value: string | undefined): string {
  if (!value) return 'all';
  const lower = String(value).toLowerCase().trim();
  return lower === 'selected' ? 'selected' : 'all';
}

/**
 * GET /api/contracts - List contracts with search, pagination, and filters
 */
export const getContracts = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseQueryParam(req.query.limit, 20), 100);
    const offset = parseQueryParam(req.query.offset, 0);
    const search = sanitizeSearchQuery((req.query.search || req.query.q) as string | undefined);
    const user = (req as any).user;

    // Parse date filters
    let periodToStart: Date | undefined;
    let periodToEnd: Date | undefined;

    if (req.query.period_to_start) {
      const parsed = parseDate(req.query.period_to_start as string);
      if (parsed) periodToStart = parsed;
    }

    if (req.query.period_to_end) {
      const parsed = parseDate(req.query.period_to_end as string);
      if (parsed) periodToEnd = parsed;
    }

    const result = await contractRepository.findAll({
      search,
      customerId: req.query.customer_id ? parseId(req.query.customer_id as string) || undefined : undefined,
      periodToStart,
      periodToEnd,
      priority: req.query.priority ? parseQueryParam(req.query.priority, 0) : undefined,
      offset,
      limit,
      userRole: user?.role_id,
      userCustomerId: user?.customer_id,
    });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const { data, pagination } = result.getValue();

    const response: ApiResponse = {
      success: true,
      data,
      pagination,
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

    const result = await contractRepository.findById(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const contract = result.getValue();

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

    const result = await contractRepository.findByCustomerId(user.customer_id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const contract = result.getValue();

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
      statusService: statusServiceCamel,
      discount,
      dsc_urgent,
      dsc_very_urgent,
      promotion_id,
      remarks,
      services,
      packages,
    } = req.body;

    // Validate required fields (code is auto-generated)
    if (!customer_id || !period) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_id, period',
      });
      return;
    }

    // Auto-generate contract code
    const code = await generateContractCode();

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

    // Parse status_service (handle both snake_case and camelCase)
    const rawStatusService = status_service ?? statusServiceCamel;
    const statusService = parseStatusService(rawStatusService);

    // Check duplicate code
    const codeCheckResult = await contractRepository.findByCode(code);
    if (codeCheckResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: codeCheckResult.error,
      });
      return;
    }

    if (codeCheckResult.getValue()) {
      res.status(409).json({
        success: false,
        message: 'Contract code already exists',
      });
      return;
    }

    // Check overlap
    const overlapResult = await contractRepository.checkOverlap(
      parseInt(customer_id),
      periodFrom,
      periodTo
    );

    if (overlapResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: overlapResult.error,
      });
      return;
    }

    const overlapCheck = overlapResult.getValue();
    if (overlapCheck.hasOverlap && overlapCheck.overlappingContract) {
      const oc = overlapCheck.overlappingContract;
      res.status(409).json({
        success: false,
        message: `Contract overlaps with existing contract ${oc.code} (${formatDate(oc.periodFrom)} - ${formatDate(oc.periodTo)})`,
      });
      return;
    }

    // Handle documents - store only the filename, not JSON
    let documents: string | null = null;
    if (req.body.contract_document) {
      let docValue = req.body.contract_document;
      // If it's a JSON string, parse it to get the actual value
      if (typeof docValue === 'string') {
        // Try to parse if it looks like JSON
        let parsed = docValue;
        let maxIterations = 5;
        while (maxIterations-- > 0 && typeof parsed === 'string' && (parsed.startsWith('[') || parsed.startsWith('"'))) {
          try {
            const temp = JSON.parse(parsed);
            parsed = Array.isArray(temp) ? temp[0] : temp;
          } catch {
            break;
          }
        }
        documents = typeof parsed === 'string' ? parsed : null;
      } else if (Array.isArray(docValue)) {
        documents = docValue[0] || null;
      }
    }

    // Prepare service details
    const serviceDetails: ContractDetailDTO[] = [];
    if (statusService === 'selected' && services && Array.isArray(services)) {
      for (const service of services) {
        if (service.service_id) {
          serviceDetails.push({
            serviceId: parseInt(service.service_id),
            discountNormal: service.discount ? parseFloat(service.discount) : 0,
            discountUrgent: service['pc-urgent'] ? parseInt(service['pc-urgent']) : 50,
            discountVeryUrgent: service['pc-very-urgent'] ? parseInt(service['pc-very-urgent']) : 100,
          });
        }
      }
    }

    // Prepare package details
    const packageDetails: ContractDetailDTO[] = [];
    if (statusService === 'selected' && packages && Array.isArray(packages)) {
      for (const pkg of packages) {
        if (pkg.package_id) {
          packageDetails.push({
            packageId: parseInt(pkg.package_id),
            discountNormal: pkg.discount ? parseFloat(pkg.discount) : 0,
            discountUrgent: pkg['pc-urgent'] ? parseInt(pkg['pc-urgent']) : 50,
            discountVeryUrgent: pkg['pc-very-urgent'] ? parseInt(pkg['pc-very-urgent']) : 100,
          });
        }
      }
    }

    // Create contract
    const result = await contractRepository.create(
      {
        code: code.trim(),
        customerId: parseInt(customer_id),
        period,
        periodFrom,
        periodTo,
        periodAlias: period_alias || null,
        normalDay: parseInt(normal_day),
        urgentDay: parseInt(urgent_day),
        veryUrgentDay: parseInt(very_urgent_day),
        statusService,
        discount: discount ? parseFloat(discount) : 0,
        discountUrgent: dsc_urgent ? parseInt(dsc_urgent) : 50,
        discountVeryUrgent: dsc_very_urgent ? parseInt(dsc_very_urgent) : 100,
        promotionId: promotion_id ? parseInt(promotion_id) : null,
        remarks: remarks || null,
        documents,
        createdBy,
      },
      serviceDetails,
      packageDetails
    );

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result.getValue(),
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
      const deleteResult = await contractRepository.delete(id, updatedBy);
      if (deleteResult.isFailure()) {
        res.status(404).json({
          success: false,
          message: deleteResult.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Contract deleted successfully',
      });
      return;
    }

    // Get existing contract
    const existingResult = await contractRepository.findById(id);
    if (existingResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: existingResult.error,
      });
      return;
    }

    const existing = existingResult.getValue();
    if (!existing) {
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
      statusService: statusServiceCamel,
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
      const codeCheckResult = await contractRepository.findByCode(code, id);
      if (codeCheckResult.isFailure()) {
        res.status(500).json({
          success: false,
          message: codeCheckResult.error,
        });
        return;
      }

      if (codeCheckResult.getValue()) {
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

    // Validate no overlap if dates or customer changed
    const customerId = customer_id ? parseInt(customer_id) : existing.customerId;
    if (periodFrom !== existing.periodFrom || periodTo !== existing.periodTo || customerId !== existing.customerId) {
      const overlapResult = await contractRepository.checkOverlap(customerId, periodFrom, periodTo, id);

      if (overlapResult.isFailure()) {
        res.status(500).json({
          success: false,
          message: overlapResult.error,
        });
        return;
      }

      const overlapCheck = overlapResult.getValue();
      if (overlapCheck.hasOverlap && overlapCheck.overlappingContract) {
        const oc = overlapCheck.overlappingContract;
        res.status(409).json({
          success: false,
          message: `Contract overlaps with existing contract ${oc.code} (${formatDate(oc.periodFrom)} - ${formatDate(oc.periodTo)})`,
        });
        return;
      }
    }

    // Parse status_service (handle both snake_case and camelCase)
    const rawStatusService = status_service ?? statusServiceCamel;
    const statusService = rawStatusService
      ? parseStatusService(rawStatusService)
      : existing.statusService;

    // Handle documents - store only the filename, not JSON
    let documents: string | null | undefined = undefined;
    if (req.body.contract_document !== undefined) {
      if (req.body.contract_document === null) {
        documents = null;
      } else {
        let docValue = req.body.contract_document;
        // If it's a JSON string, parse it to get the actual value
        if (typeof docValue === 'string') {
          // Try to parse if it looks like JSON
          let parsed = docValue;
          let maxIterations = 5;
          while (maxIterations-- > 0 && typeof parsed === 'string' && (parsed.startsWith('[') || parsed.startsWith('"'))) {
            try {
              const temp = JSON.parse(parsed);
              parsed = Array.isArray(temp) ? temp[0] : temp;
            } catch {
              break;
            }
          }
          documents = typeof parsed === 'string' ? parsed : null;
        } else if (Array.isArray(docValue)) {
          documents = docValue[0] || null;
        }
      }
    }

    // Prepare service details
    const serviceDetails: ContractDetailDTO[] = [];
    if (services && Array.isArray(services)) {
      for (const service of services) {
        if (service.service_id) {
          serviceDetails.push({
            serviceId: parseInt(service.service_id),
            discountNormal: service.discount ? parseFloat(service.discount) : 0,
            discountUrgent: service['pc-urgent'] ? parseInt(service['pc-urgent']) : 50,
            discountVeryUrgent: service['pc-very-urgent'] ? parseInt(service['pc-very-urgent']) : 100,
          });
        }
      }
    }

    // Prepare package details
    const packageDetails: ContractDetailDTO[] = [];
    if (packages && Array.isArray(packages)) {
      for (const pkg of packages) {
        if (pkg.package_id) {
          packageDetails.push({
            packageId: parseInt(pkg.package_id),
            discountNormal: pkg.discount ? parseFloat(pkg.discount) : 0,
            discountUrgent: pkg['pc-urgent'] ? parseInt(pkg['pc-urgent']) : 50,
            discountVeryUrgent: pkg['pc-very-urgent'] ? parseInt(pkg['pc-very-urgent']) : 100,
          });
        }
      }
    }

    // Update contract
    const result = await contractRepository.update(
      id,
      {
        code: code?.trim(),
        customerId: customer_id ? parseInt(customer_id) : undefined,
        period,
        periodFrom,
        periodTo,
        periodAlias: period_alias,
        normalDay: normal_day ? parseInt(normal_day) : undefined,
        urgentDay: urgent_day ? parseInt(urgent_day) : undefined,
        veryUrgentDay: very_urgent_day ? parseInt(very_urgent_day) : undefined,
        statusService,
        discount: discount !== undefined ? (discount ? parseFloat(discount) : 0) : undefined,
        discountUrgent: dsc_urgent !== undefined ? (dsc_urgent ? parseInt(dsc_urgent) : 50) : undefined,
        discountVeryUrgent: dsc_very_urgent !== undefined ? (dsc_very_urgent ? parseInt(dsc_very_urgent) : 100) : undefined,
        promotionId: promotion_id !== undefined ? (promotion_id ? parseInt(promotion_id) : null) : undefined,
        remarks: remarks !== undefined ? (remarks || null) : undefined,
        documents,
        updatedBy,
      },
      serviceDetails.length > 0 ? serviceDetails : undefined,
      packageDetails.length > 0 ? packageDetails : undefined
    );

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: result.getValue(),
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

    const result = await contractRepository.delete(id, updatedBy);

    if (result.isFailure()) {
      res.status(404).json({
        success: false,
        message: result.error,
      });
      return;
    }

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

    const result = await contractRepository.findForAutocomplete(searchQuery, useDataTable);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const items = result.getValue();

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
      res.send(JSON.stringify(response, null, 2));
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
    const perPage = Math.min(parseQueryParam(req.query.per_page, 20), 100);
    const page = parseQueryParam(req.query.page, 1);
    const offset = (page - 1) * perPage;
    const user = (req as any).user;

    // Parse date filters
    let periodToStart: Date | undefined;
    let periodToEnd: Date | undefined;

    if (req.query.periode_to_start) {
      const parsed = parseDate(req.query.periode_to_start as string);
      if (parsed) periodToStart = parsed;
    }

    if (req.query.periode_to_end) {
      const parsed = parseDate(req.query.periode_to_end as string);
      if (parsed) periodToEnd = parsed;
    }

    const result = await contractRepository.findWithFilters({
      customerId: req.query.customer_id ? parseId(req.query.customer_id as string) || undefined : undefined,
      periodToStart,
      periodToEnd,
      priority: req.query.priority ? parseQueryParam(req.query.priority, 0) : undefined,
      offset,
      limit: perPage,
      userRole: user?.role_id,
      userCustomerId: user?.customer_id,
    });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const { data, pagination } = result.getValue();

    res.json({
      total_count: pagination.total,
      items: data,
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
