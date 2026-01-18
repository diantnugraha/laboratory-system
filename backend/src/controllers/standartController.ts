import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { StandartRepository } from '../repositories/implementations/StandartRepository.js';
import { sanitizeSearchQuery } from '../utils/searchHelper.js';
import { parseId, parseQueryParam, parseBooleanParam, ApiResponse } from '../types/index.js';
import { parseMinMaxValue, validateMinMaxRange } from '../utils/standartHelper.js';

// Initialize repository
const standartRepo = new StandartRepository(prisma);

/**
 * GET /api/standards - List with search & pagination
 * Supports query parameter ?select=true for dropdown/select options
 */
export const getAllStandards = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const isSelect = parseBooleanParam((request.query as any).select as string | string[] | undefined);
    const page = parseQueryParam((request.query as any).page, 1);
    const limit = parseQueryParam((request.query as any).limit, 20);
    const search = sanitizeSearchQuery(typeof (request.query as any).search === 'string' ? (request.query as any).search : undefined);

    // Call repository
    const result = await standartRepo.findAll({ search, page, limit, select: isSelect });

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
    console.error('getAll standards error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch standards',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/standards/:id - Get standard detail by ID
 */
export const getStandardById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Call repository
    const result = await standartRepo.findById(id);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getStandardById error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch standard',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/standards - Create new standard
 */
export const createStandard = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const {
      code,
      name,
      category_id,
      customer_id,
      standartDetails
    } = request.body as any;

    // Validate required fields
    if (!code || !name) {
      return reply.code(400).send({
        success: false,
        message: 'Code and name are required'
      });
    }

    // Check if code already exists via repository
    const codeResult = await standartRepo.findByCode(code);
    if (codeResult.isSuccess() && codeResult.getValue() !== null) {
      return reply.code(409).send({
        success: false,
        message: 'Code already exists'
      });
    }

    // Check if name already exists via repository
    const nameResult = await standartRepo.findByName(name);
    if (nameResult.isSuccess() && nameResult.getValue() !== null) {
      return reply.code(409).send({
        success: false,
        message: 'Name already exists'
      });
    }

    // Validate foreign keys if provided via repository
    if (category_id) {
      const categoryValid = await standartRepo.validateCategoryExists(category_id);
      if (categoryValid.isFailure() || !categoryValid.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Category not found'
        });
      }
    }

    if (customer_id) {
      const customerValid = await standartRepo.validateCustomerExists(customer_id);
      if (customerValid.isFailure() || !customerValid.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Customer not found'
        });
      }
    }

    // Validate that at least one detail is provided
    if (!standartDetails || !Array.isArray(standartDetails) || standartDetails.length === 0) {
      return reply.code(400).send({
        success: false,
        message: 'At least one standartDetail is required'
      });
    }

    // Validate standartDetails
    for (const detail of standartDetails) {
      if (!detail.service_id || detail.min === undefined || detail.max === undefined || !detail.unit) {
        return reply.code(400).send({
          success: false,
          message: 'Each standartDetail must have service_id, min, max, and unit'
        });
      }

      // Parse and validate min/max values
      try {
        parseMinMaxValue(detail.min);
        parseMinMaxValue(detail.max);
        // Validate min <= max
        validateMinMaxRange(detail.min, detail.max);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid min/max values';
        return reply.code(400).send({
          success: false,
          message: errorMessage
        });
      }

      // Check if service exists via repository
      const serviceValid = await standartRepo.validateServiceExists(detail.service_id);
      if (serviceValid.isFailure() || !serviceValid.getValue()) {
        return reply.code(404).send({
          success: false,
          message: `Service with id ${detail.service_id} not found`
        });
      }
    }

    const createdBy = (request as any).user?.id || 1;

    // Prepare standartDetails data with parsed min/max values
    const standartDetailsData = standartDetails.map((detail: any) => {
      // Parse min/max values (already validated above, but parse again to ensure consistency)
      const parsedMin = parseMinMaxValue(detail.min);
      const parsedMax = parseMinMaxValue(detail.max);
      return {
        service_id: detail.service_id,
        min: parsedMin,
        max: parsedMax,
        unit: detail.unit
      };
    });

    // Create standard via repository (handles transaction internally)
    const result = await standartRepo.create({
      code,
      name,
      category_id: category_id || null,
      customer_id: customer_id || null,
      created_by: createdBy,
      standartDetails: standartDetailsData
    });

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.code(201).send({
      success: true,
      message: 'Standard created successfully',
      data: result.getValue(),
    });
  } catch (error) {
    console.error('createStandard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to create standard',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/standards/:id - Update standard
 */
export const updateStandard = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if standard exists via repository
    const existingResult = await standartRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Standard not found',
      });
    }

    const existingStandard = existingResult.getValue();

    const {
      code,
      name,
      category_id,
      customer_id,
      standartDetails
    } = request.body as any;

    // Check if code is being changed and if it already exists
    if (code && code !== existingStandard.code) {
      const codeResult = await standartRepo.findByCode(code, id);
      if (codeResult.isSuccess() && codeResult.getValue() !== null) {
        return reply.code(409).send({
          success: false,
          message: 'Code already exists'
        });
      }
    }

    // Check if name is being changed and if it already exists
    if (name && name !== existingStandard.name) {
      const nameResult = await standartRepo.findByName(name, id);
      if (nameResult.isSuccess() && nameResult.getValue() !== null) {
        return reply.code(409).send({
          success: false,
          message: 'Name already exists'
        });
      }
    }

    // Validate foreign keys if provided via repository
    if (category_id !== undefined) {
      if (category_id !== null) {
        const categoryValid = await standartRepo.validateCategoryExists(category_id);
        if (categoryValid.isFailure() || !categoryValid.getValue()) {
          return reply.code(404).send({
            success: false,
            message: 'Category not found'
          });
        }
      }
    }

    if (customer_id !== undefined) {
      if (customer_id !== null) {
        const customerValid = await standartRepo.validateCustomerExists(customer_id);
        if (customerValid.isFailure() || !customerValid.getValue()) {
          return reply.code(404).send({
            success: false,
            message: 'Customer not found'
          });
        }
      }
    }

    // Validate standartDetails if provided
    if (standartDetails && Array.isArray(standartDetails)) {
      for (const detail of standartDetails) {
        if (!detail.service_id || detail.min === undefined || detail.max === undefined || !detail.unit) {
          return reply.code(400).send({
            success: false,
            message: 'Each standartDetail must have service_id, min, max, and unit'
          });
        }

        // Parse and validate min/max values
        try {
          parseMinMaxValue(detail.min);
          parseMinMaxValue(detail.max);
          // Validate min <= max
          validateMinMaxRange(detail.min, detail.max);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Invalid min/max values';
          return reply.code(400).send({
            success: false,
            message: errorMessage
          });
        }

        // Check if service exists via repository
        const serviceValid = await standartRepo.validateServiceExists(detail.service_id);
        if (serviceValid.isFailure() || !serviceValid.getValue()) {
          return reply.code(404).send({
            success: false,
            message: `Service with id ${detail.service_id} not found`
          });
        }
      }
    }

    // Build update data
    const updateData: any = {};

    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (customer_id !== undefined) updateData.customer_id = customer_id;

    // Set updated_by if user is authenticated
    if ((request as any).user?.id) {
      updateData.updated_by = (request as any).user.id;
    }

    // Prepare standartDetails data with parsed min/max values
    if (standartDetails && Array.isArray(standartDetails)) {
      try {
        updateData.standartDetails = standartDetails.map((detail: any) => {
          // Parse min/max values (already validated above, but parse again to ensure consistency)
          const parsedMin = parseMinMaxValue(detail.min);
          const parsedMax = parseMinMaxValue(detail.max);
          return {
            service_id: detail.service_id,
            min: parsedMin,
            max: parsedMax,
            unit: detail.unit
          };
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse standartDetails';
        return reply.code(400).send({
          success: false,
          message: errorMessage
        });
      }
    }

    // Update standard via repository (handles transaction internally)
    const result = await standartRepo.update(id, updateData);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Standard updated successfully',
      data: result.getValue(),
    });
  } catch (error) {
    console.error('updateStandard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to update standard',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/standards/:id - Delete standard (soft delete)
 */
export const deleteStandard = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if standard exists via repository
    const existingResult = await standartRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Standard not found',
      });
    }

    // Delete via repository
    const result = await standartRepo.delete(id);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Standard deleted successfully'
    });
  } catch (error) {
    console.error('deleteStandard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to delete standard',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/standards/json - JSON endpoint for autocomplete/search with customer filtering
 * Query params: q (search term), dataTable (boolean flag)
 * Customer role (role_id 16) will only see standards linked to their customer_id
 */
export const getStandardsJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const searchQuery = sanitizeSearchQuery(typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined);
    const isDataTable = parseBooleanParam((request.query as any).dataTable as string | string[] | undefined);

    // Customer role filtering: if user is Customer role (role_id 16), filter by their customer_id
    let customerId: number | undefined;
    if ((request as any).user?.role_id === 16 && (request as any).user?.customer_id) {
      customerId = (request as any).user.customer_id;
    }

    // Call repository with customer filtering
    const result = await standartRepo.findForJson(
      {
        search: searchQuery,
        customer_id: customerId,
      },
      isDataTable
    );

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send(result.getValue());
  } catch (error) {
    console.error('getStandardsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch standards',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/standards/fetchJson - JSON endpoint with pagination for DataTable
 * Query params: per_page (default: 20, max: 100), page (default: 1), order_by (optional)
 */
export const getStandardsFetchJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const perPage = Math.min(parseQueryParam((request.query as any).per_page, 20), 100);
    const page = parseQueryParam((request.query as any).page, 1);
    const searchQuery = sanitizeSearchQuery(typeof (request.query as any).search === 'string' ? (request.query as any).search : undefined);
    const orderBy = typeof (request.query as any).order_by === 'string' ? (request.query as any).order_by : undefined;

    // Call repository
    const result = await standartRepo.findForFetchJson({
      search: searchQuery,
      perPage,
      page,
      orderBy,
    });

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send(result.getValue());
  } catch (error) {
    console.error('getStandardsFetchJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch standards',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
