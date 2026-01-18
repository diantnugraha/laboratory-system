import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { ServiceRepository } from '../repositories/implementations/ServiceRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';

// Initialize repository
const serviceRepo = new ServiceRepository(prisma);

/**
 * Generate auto-incrementing service code (SVC.00001, SVC.00002, etc.)
 */
async function generateServiceCode(): Promise<string> {
  const lastService = await (prisma as any).service.findFirst({
    where: { trash: null },
    orderBy: { id: 'desc' },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastService?.code) {
    const match = lastService.code.match(/SVC\.(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `SVC.${String(nextNumber).padStart(5, '0')}`;
}

/**
 * GET /api/services/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const code = await generateServiceCode();
    return reply.send({ success: true, data: { code } });
  } catch (error) {
    console.error('generateCode error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to generate code',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services - List dengan search & pagination
 */
export const getAllServices = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const page = parseQueryParam((request.query as any).page, 1);
    const limit = parseQueryParam((request.query as any).limit, 20);
    const search = typeof (request.query as any).search === 'string' ? (request.query as any).search : undefined;

    // Call repository
    const result = await serviceRepo.findAll({ search, page, limit });

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const data = result.getValue();

    // Return formatted response
    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination,
    };

    return reply.send(response);
  } catch (error) {
    console.error('getAll services error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/:id
 */
export const getServiceById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Call repository
    const result = await serviceRepo.findById(id);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getById service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch service',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/services
 */
export const createService = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
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
    } = request.body as any;

    // HTTP validation stays in controller
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Code is required'
      });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Name is required'
      });
    }

    if (!category_id || typeof category_id !== 'number') {
      return reply.code(400).send({
        success: false,
        message: 'Category ID is required'
      });
    }

    if (parameter_id === undefined || typeof parameter_id !== 'number') {
      return reply.code(400).send({
        success: false,
        message: 'Parameter ID is required'
      });
    }

    if (!method_id || typeof method_id !== 'number') {
      return reply.code(400).send({
        success: false,
        message: 'Method ID is required'
      });
    }

    if (!price || typeof price !== 'number' || price < 0) {
      return reply.code(400).send({
        success: false,
        message: 'Price is required and must be a non-negative number'
      });
    }

    // Check code uniqueness via repository
    const duplicateCode = await serviceRepo.findByCode(code.trim());
    if (duplicateCode.isSuccess() && duplicateCode.getValue() !== null) {
      return reply.code(409).send({
        success: false,
        message: 'Code already exists'
      });
    }

    // Validate required foreign keys via repository
    const [categoryValidation, parameterValidation, methodValidation] = await Promise.all([
      serviceRepo.validateCategoryExists(category_id),
      serviceRepo.validateParameterExists(parameter_id),
      serviceRepo.validateMethodExists(method_id)
    ]);

    if (categoryValidation.isFailure() || !categoryValidation.getValue()) {
      return reply.code(404).send({
        success: false,
        message: 'Category not found'
      });
    }

    if (parameterValidation.isFailure() || !parameterValidation.getValue()) {
      return reply.code(404).send({
        success: false,
        message: 'Parameter not found'
      });
    }

    if (methodValidation.isFailure() || !methodValidation.getValue()) {
      return reply.code(404).send({
        success: false,
        message: 'Method not found'
      });
    }

    // Validate optional foreign keys if provided
    if (subcontractor_id) {
      const subcontractorValidation = await serviceRepo.validateSubcontractorExists(subcontractor_id);
      if (subcontractorValidation.isFailure() || !subcontractorValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Subcontractor not found'
        });
      }
    }

    if (analyst_type_id) {
      const analystTypeValidation = await serviceRepo.validateAnalystTypeExists(analyst_type_id);
      if (analystTypeValidation.isFailure() || !analystTypeValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Analyst Type not found'
        });
      }
    }

    // Get user ID from request (set by authenticate middleware)
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.code(401).send({
        success: false,
        message: 'Authentication required'
      });
    }

    // Create service via repository
    const result = await serviceRepo.create({
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
      price,
      user: user || 1,
      use_pc: use_pc || 0,
      status: status?.trim() || null,
    }, userId);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.code(201).send({
      success: true,
      message: 'Service created successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('create service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to create service',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/services/:id
 */
export const updateService = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check service exists using repository
    const existingResult = await serviceRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Service not found'
      });
    }

    const existing = existingResult.getValue();

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
    } = request.body as any;

    // Check code uniqueness (exclude self) via repository
    if (code && typeof code === 'string' && code.trim() !== '') {
      const duplicateCode = await serviceRepo.findByCode(code.trim(), id);
      if (duplicateCode.isSuccess() && duplicateCode.getValue() !== null) {
        return reply.code(409).send({
          success: false,
          message: 'Code already exists'
        });
      }
    }

    // Validate foreign keys if provided via repository
    if (category_id !== undefined) {
      const categoryValidation = await serviceRepo.validateCategoryExists(category_id);
      if (categoryValidation.isFailure() || !categoryValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Category not found'
        });
      }
    }

    if (parameter_id !== undefined) {
      const parameterValidation = await serviceRepo.validateParameterExists(parameter_id);
      if (parameterValidation.isFailure() || !parameterValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Parameter not found'
        });
      }
    }

    if (method_id !== undefined) {
      const methodValidation = await serviceRepo.validateMethodExists(method_id);
      if (methodValidation.isFailure() || !methodValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Method not found'
        });
      }
    }

    if (subcontractor_id !== undefined && subcontractor_id !== null) {
      const subcontractorValidation = await serviceRepo.validateSubcontractorExists(subcontractor_id);
      if (subcontractorValidation.isFailure() || !subcontractorValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Subcontractor not found'
        });
      }
    }

    if (analyst_type_id !== undefined && analyst_type_id !== null) {
      const analystTypeValidation = await serviceRepo.validateAnalystTypeExists(analyst_type_id);
      if (analystTypeValidation.isFailure() || !analystTypeValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Analyst Type not found'
        });
      }
    }

    // Get user ID from request
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.code(401).send({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if price changed for history tracking
    const priceChanged = price !== undefined && typeof price === 'number' && price !== existing.price;

    // Prepare update data
    const updateData: any = {};

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
    if (price !== undefined) updateData.price = price;
    if (user !== undefined) updateData.user = user;
    if (use_pc !== undefined) updateData.use_pc = use_pc;
    if (status !== undefined) updateData.status = status?.trim() || null;

    // Update service via repository (with price history tracking)
    const result = await serviceRepo.update(id, updateData, userId, priceChanged);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Service updated successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('update service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to update service',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/services/:id
 */
export const deleteService = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);

    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if service exists using repository
    const existingResult = await serviceRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Service not found'
      });
    }

    // Get user ID from request
    const userId = (request as any).user?.id;
    if (!userId) {
      return reply.code(401).send({
        success: false,
        message: 'Authentication required'
      });
    }

    // Delete service via repository
    const result = await serviceRepo.delete(id, userId);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('delete service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
      where: { id: contractId, trash: null },
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
      where: { id: contractId, trash: null },
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
export const getServicesJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const searchTerm = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;
    const product = (request.query as any).product !== undefined;
    const nonparameter = (request.query as any).nonparameter !== undefined;
    const contractId = typeof (request.query as any).contract_id === 'string' ? parseId((request.query as any).contract_id) : undefined;
    const isDataTable = (request.query as any).dataTable !== undefined;

    // Call repository
    const limit = isDataTable ? 10000 : 150;
    const result = await serviceRepo.findForJson('cts', product, nonparameter, !isDataTable, searchTerm, limit);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const services = result.getValue();

    // Batch fetch contract pricing if contract_id provided
    let contractDataMap: Map<number, any> | undefined;
    if (contractId && services.length > 0) {
      contractDataMap = await getContractPricingBatch(
        services.map((s: any) => s.id),
        contractId
      );
    }

    const items = services.map((service: any) =>
      mapServiceToJson(service, contractDataMap?.get(service.id))
    );

    const response: any = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
    };

    if ((request.query as any).pretty !== undefined) {
      reply.header('Content-Type', 'application/json');
      return reply.send(JSON.stringify(response, null, 2));
    } else {
      return reply.send(response);
    }
  } catch (error) {
    console.error('getServicesJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/json-global - JSON API for all lab services
 */
export const getServicesJsonGlobal = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const searchTerm = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;
    const product = (request.query as any).product !== undefined;
    const nonparameter = (request.query as any).nonparameter !== undefined;
    const contractId = typeof (request.query as any).contract_id === 'string' ? parseId((request.query as any).contract_id) : undefined;
    const isDataTable = (request.query as any).dataTable !== undefined;

    // Call repository
    const limit = isDataTable ? 10000 : 150;
    const result = await serviceRepo.findForJson('all', product, nonparameter, !isDataTable, searchTerm, limit);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const services = result.getValue();

    let contractDataMap: Map<number, any> | undefined;
    if (contractId && services.length > 0) {
      contractDataMap = await getContractPricingBatch(
        services.map((s: any) => s.id),
        contractId
      );
    }

    const items = services.map((service: any) =>
      mapServiceToJson(service, contractDataMap?.get(service.id))
    );

    const response: any = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
    };

    if ((request.query as any).pretty !== undefined) {
      reply.header('Content-Type', 'application/json');
      return reply.send(JSON.stringify(response, null, 2));
    } else {
      return reply.send(response);
    }
  } catch (error) {
    console.error('getServicesJsonGlobal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
export const getServicesJsonEnv = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const searchTerm = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;
    const product = (request.query as any).product !== undefined;
    const nonparameter = (request.query as any).nonparameter !== undefined;
    const contractId = typeof (request.query as any).contract_id === 'string' ? parseId((request.query as any).contract_id) : undefined;
    const isDataTable = (request.query as any).dataTable !== undefined;

    // Call repository
    const limit = isDataTable ? 10000 : 150;
    const result = await serviceRepo.findForJson('env', product, nonparameter, !isDataTable, searchTerm, limit);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const services = result.getValue();

    let contractDataMap: Map<number, any> | undefined;
    if (contractId && services.length > 0) {
      contractDataMap = await getContractPricingBatch(
        services.map((s: any) => s.id),
        contractId
      );
    }

    const items = services.map((service: any) =>
      mapServiceToJson(service, contractDataMap?.get(service.id))
    );

    const response: any = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
    };

    if ((request.query as any).pretty !== undefined) {
      reply.header('Content-Type', 'application/json');
      return reply.send(JSON.stringify(response, null, 2));
    } else {
      return reply.send(response);
    }
  } catch (error) {
    console.error('getServicesJsonEnv error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/json2 - DataTable format with analyst count
 * Note: Analyst counting logic stays in controller (uses models that may not exist)
 */
export const getServicesDataTable = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const sEcho = parseQueryParam((request.query as any).sEcho, 1);
    const iDisplayStart = parseQueryParam((request.query as any).iDisplayStart, 0);
    const iDisplayLength = Math.min(parseQueryParam((request.query as any).iDisplayLength, 10), 10000);
    const sSearch = typeof (request.query as any).sSearch === 'string' ? (request.query as any).sSearch : undefined;

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

    return reply.send({
      sEcho,
      iTotalRecords,
      iTotalDisplayRecords: iTotalRecords,
      Data: [],
      aaData
    });
  } catch (error) {
    console.error('getServicesDataTable error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/json-top - Service usage statistics for charts
 * Note: Statistics logic stays in controller (uses raw SQL and models that may not exist)
 */
export const getServiceStatistics = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const isDataTable = (request.query as any).dataTable !== undefined;
    const targetYear = typeof (request.query as any).year === 'string' ? parseInt((request.query as any).year) : new Date().getFullYear();

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

    return reply.send(response);
  } catch (error) {
    console.error('getServiceStatistics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch statistics',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/fetch-json - Paginated service list with advanced filters
 */
export const getServicesFetch = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const status = typeof (request.query as any).status === 'string' ? (request.query as any).status : undefined;
    const user = typeof (request.query as any).user === 'string' ? parseId((request.query as any).user) : undefined;
    const method = typeof (request.query as any).method === 'string' ? (request.query as any).method : undefined;
    const name = typeof (request.query as any).name === 'string' ? (request.query as any).name : undefined;
    const perPage = parseQueryParam((request.query as any).per_page, 20);
    const page = parseQueryParam((request.query as any).page, 1);
    // @ts-ignore
    const orderByStr = typeof (request.query as any).order_by === 'string' ? (request.query as any).order_by : 't.id DESC';
    const contractId = typeof (request.query as any).contract_id === 'string' ? parseId((request.query as any).contract_id) : 36;

    // Check user role for status filter
    // @ts-ignore
    const userRole = (request as any).user?.role_id;
    const isCustomer = userRole === 8;

    // Build filter
    const filter: any = {
      status,
      user,
      method,
      name,
      page,
      limit: perPage
    };

    // Override status for customers
    if (!status && isCustomer) {
      // Note: Repository doesn't support IN clause for status yet
      // So we handle this in controller for now
      filter.status = undefined; // Will need custom logic
    } else if (!status) {
      filter.status = undefined;
    }

    // Parse order_by (simple implementation)
    let orderBy: any = { id: 'desc' };
    if (orderByStr.includes('ASC')) {
      orderBy = { id: 'asc' };
    } else if (orderByStr.includes('name')) {
      orderBy = orderByStr.includes('ASC') ? { name: 'asc' } : { name: 'desc' };
    }

    // Call repository
    const result = await serviceRepo.findForFetch(filter, orderBy);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const { data: services, pagination } = result.getValue();

    // Get contract pricing if contract_id provided
    let contractDataMap: Map<number, any> | undefined;
    if (contractId && services.length > 0) {
      contractDataMap = await getContractPricingBatch(
        services.map((s: any) => s.id),
        contractId
      );
    }

    const items = services.map((service: any) => {
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

    return reply.send({
      total_count: pagination.total,
      items
    });
  } catch (error) {
    console.error('getServicesFetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/services/report - CSV export
 * Note: Analyst counting logic stays in controller
 */
export const exportServiceReport = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const start = typeof (request.query as any).start === 'string' ? (request.query as any).start : undefined;
    const end = typeof (request.query as any).end === 'string' ? (request.query as any).end : undefined;

    // Validate date format (YYYY-MM-DD) - HTTP validation in controller
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid start date format (expected YYYY-MM-DD)'
      });
    }

    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid end date format (expected YYYY-MM-DD)'
      });
    }

    // Repository provides data
    const result = await serviceRepo.findAllForReport(start, end);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const services = result.getValue();

    // Get analyst count for each service (complex logic stays in controller)
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

    // CSV formatting logic stays in controller (presentation layer)
    const escapeCSV = (value: string | null | undefined): string => {
      if (!value) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = 'CODE, NAME, METHOD, SAMPLE MATRIX, CATEGORY NAME, ACCREDITATION, STATUS, LOD, LOQ, PRICE, TOTAL ANALYST\r\n';
    const rows = services.map((s: any) =>
      `${escapeCSV(s.code)},${escapeCSV(s.name)},${escapeCSV(s.method?.name || '')},${escapeCSV(s.method?.matrix?.name || '')},${escapeCSV(s.category?.name || '')},${escapeCSV(s.accreditation || '')},${escapeCSV(s.status || '')},${escapeCSV(s.lod || '')},${escapeCSV(s.loq || '')},${escapeCSV(String(s.price))},${escapeCSV(String(analystCounts.get(s.id) || 0))}`
    ).join('\r\n');

    const csv = header + rows;

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="report-service.csv"');
    return reply.send(csv);
  } catch (error) {
    console.error('exportServiceReport error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to generate report',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
