import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { StandartRepository } from '../repositories/implementations/StandartRepository';
import { sanitizeSearchQuery } from '../utils/searchHelper';
import { parseId, parseQueryParam, parseBooleanParam, ApiResponse } from '../types';
import { parseMinMaxValue, validateMinMaxRange } from '../utils/standartHelper';

// Initialize repository
const standartRepo = new StandartRepository(prisma);

/**
 * GET /api/standards - List with search & pagination
 * Supports query parameter ?select=true for dropdown/select options
 */
export const getAllStandards = async (req: Request, res: Response): Promise<void> => {
  try {
    const isSelect = parseBooleanParam(req.query.select as string | string[] | undefined);
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = sanitizeSearchQuery(typeof req.query.search === 'string' ? req.query.search : undefined);

    // Call repository
    const result = await standartRepo.findAll({ search, page, limit, select: isSelect });

    // Handle repository result
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const data = result.getValue();

    // Select mode returns array directly, standard mode returns paginated data
    if (isSelect) {
      res.json({
        success: true,
        data
      });
    } else {
      const response: ApiResponse = {
        success: true,
        data: data.data,
        pagination: data.pagination,
      };
      res.json(response);
    }
  } catch (error) {
    console.error('getAll standards error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch standards',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/standards/:id - Get standard detail by ID
 */
export const getStandardById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Call repository
    const result = await standartRepo.findById(id);

    // Handle repository result
    if (result.isFailure()) {
      res.status(404).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getStandardById error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch standard',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/standards - Create new standard
 */
export const createStandard = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      name,
      category_id,
      customer_id,
      standartDetails
    } = req.body;

    // Validate required fields
    if (!code || !name) {
      res.status(400).json({
        success: false,
        message: 'Code and name are required'
      });
      return;
    }

    // Check if code already exists via repository
    const codeResult = await standartRepo.findByCode(code);
    if (codeResult.isSuccess() && codeResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Code already exists'
      });
      return;
    }

    // Check if name already exists via repository
    const nameResult = await standartRepo.findByName(name);
    if (nameResult.isSuccess() && nameResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Validate foreign keys if provided via repository
    if (category_id) {
      const categoryValid = await standartRepo.validateCategoryExists(category_id);
      if (categoryValid.isFailure() || !categoryValid.getValue()) {
        res.status(404).json({
          success: false,
          message: 'Category not found'
        });
        return;
      }
    }

    if (customer_id) {
      const customerValid = await standartRepo.validateCustomerExists(customer_id);
      if (customerValid.isFailure() || !customerValid.getValue()) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }
    }

    // Validate that at least one detail is provided
    if (!standartDetails || !Array.isArray(standartDetails) || standartDetails.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one standartDetail is required'
      });
      return;
    }

    // Validate standartDetails
    for (const detail of standartDetails) {
      if (!detail.service_id || detail.min === undefined || detail.max === undefined || !detail.unit) {
        res.status(400).json({
          success: false,
          message: 'Each standartDetail must have service_id, min, max, and unit'
        });
        return;
      }

      // Parse and validate min/max values
      try {
        parseMinMaxValue(detail.min);
        parseMinMaxValue(detail.max);
        // Validate min <= max
        validateMinMaxRange(detail.min, detail.max);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid min/max values';
        res.status(400).json({
          success: false,
          message: errorMessage
        });
        return;
      }

      // Check if service exists via repository
      const serviceValid = await standartRepo.validateServiceExists(detail.service_id);
      if (serviceValid.isFailure() || !serviceValid.getValue()) {
        res.status(404).json({
          success: false,
          message: `Service with id ${detail.service_id} not found`
        });
        return;
      }
    }

    const createdBy = req.user?.id || 1;

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
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Standard created successfully',
      data: result.getValue(),
    });
  } catch (error) {
    console.error('createStandard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create standard',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/standards/:id - Update standard
 */
export const updateStandard = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if standard exists via repository
    const existingResult = await standartRepo.findById(id);
    if (existingResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Standard not found',
      });
      return;
    }

    const existingStandard = existingResult.getValue();

    const {
      code,
      name,
      category_id,
      customer_id,
      standartDetails
    } = req.body;

    // Check if code is being changed and if it already exists
    if (code && code !== existingStandard.code) {
      const codeResult = await standartRepo.findByCode(code, id);
      if (codeResult.isSuccess() && codeResult.getValue() !== null) {
        res.status(409).json({
          success: false,
          message: 'Code already exists'
        });
        return;
      }
    }

    // Check if name is being changed and if it already exists
    if (name && name !== existingStandard.name) {
      const nameResult = await standartRepo.findByName(name, id);
      if (nameResult.isSuccess() && nameResult.getValue() !== null) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    // Validate foreign keys if provided via repository
    if (category_id !== undefined) {
      if (category_id !== null) {
        const categoryValid = await standartRepo.validateCategoryExists(category_id);
        if (categoryValid.isFailure() || !categoryValid.getValue()) {
          res.status(404).json({
            success: false,
            message: 'Category not found'
          });
          return;
        }
      }
    }

    if (customer_id !== undefined) {
      if (customer_id !== null) {
        const customerValid = await standartRepo.validateCustomerExists(customer_id);
        if (customerValid.isFailure() || !customerValid.getValue()) {
          res.status(404).json({
            success: false,
            message: 'Customer not found'
          });
          return;
        }
      }
    }

    // Validate standartDetails if provided
    if (standartDetails && Array.isArray(standartDetails)) {
      for (const detail of standartDetails) {
        if (!detail.service_id || detail.min === undefined || detail.max === undefined || !detail.unit) {
          res.status(400).json({
            success: false,
            message: 'Each standartDetail must have service_id, min, max, and unit'
          });
          return;
        }

        // Parse and validate min/max values
        try {
          parseMinMaxValue(detail.min);
          parseMinMaxValue(detail.max);
          // Validate min <= max
          validateMinMaxRange(detail.min, detail.max);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Invalid min/max values';
          res.status(400).json({
            success: false,
            message: errorMessage
          });
          return;
        }

        // Check if service exists via repository
        const serviceValid = await standartRepo.validateServiceExists(detail.service_id);
        if (serviceValid.isFailure() || !serviceValid.getValue()) {
          res.status(404).json({
            success: false,
            message: `Service with id ${detail.service_id} not found`
          });
          return;
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
    if (req.user?.id) {
      updateData.updated_by = req.user.id;
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
        res.status(400).json({
          success: false,
          message: errorMessage
        });
        return;
      }
    }

    // Update standard via repository (handles transaction internally)
    const result = await standartRepo.update(id, updateData);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Standard updated successfully',
      data: result.getValue(),
    });
  } catch (error) {
    console.error('updateStandard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update standard',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/standards/:id - Delete standard (soft delete)
 */
export const deleteStandard = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if standard exists via repository
    const existingResult = await standartRepo.findById(id);
    if (existingResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Standard not found',
      });
      return;
    }

    // Delete via repository
    const result = await standartRepo.delete(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Standard deleted successfully'
    });
  } catch (error) {
    console.error('deleteStandard error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
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
export const getStandardsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchQuery = sanitizeSearchQuery(typeof req.query.q === 'string' ? req.query.q : undefined);
    const isDataTable = parseBooleanParam(req.query.dataTable as string | string[] | undefined);

    // Customer role filtering: if user is Customer role (role_id 16), filter by their customer_id
    let customerId: number | undefined;
    if ((req as any).user?.role_id === 16 && (req as any).user?.customer_id) {
      customerId = (req as any).user.customer_id;
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
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json(result.getValue());
  } catch (error) {
    console.error('getStandardsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
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
export const getStandardsFetchJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const perPage = Math.min(parseQueryParam(req.query.per_page, 20), 100);
    const page = parseQueryParam(req.query.page, 1);
    const searchQuery = sanitizeSearchQuery(typeof req.query.search === 'string' ? req.query.search : undefined);
    const orderBy = typeof req.query.order_by === 'string' ? req.query.order_by : undefined;

    // Call repository
    const result = await standartRepo.findForFetchJson({
      search: searchQuery,
      perPage,
      page,
      orderBy,
    });

    // Handle repository result
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json(result.getValue());
  } catch (error) {
    console.error('getStandardsFetchJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch standards',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
