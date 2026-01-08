import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildMultiFieldSearchCondition, sanitizeSearchQuery, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, parseBooleanParam, ApiResponse } from '../types';

/**
 * Parse min/max value to String, handling special cases like "Negative"
 * @param value - The value to parse (can be string, number, or null)
 * @returns String value (converts number to string, preserves "Negative" as is)
 */
const parseMinMaxValue = (value: any): string => {
  if (value === null || value === undefined) {
    throw new Error('min and max values cannot be null or undefined');
  }

  // If already a string, trim and return
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new Error('min and max values cannot be empty strings');
    }
    return trimmed;
  }

  // If number, convert to string
  if (typeof value === 'number') {
    if (isNaN(value)) {
      throw new Error('min and max must be valid numbers');
    }
    return value.toString();
  }

  // Convert other types to string
  return String(value);
};

/**
 * Validate that min <= max (only when both are numeric)
 * @param min - Minimum value (string or number)
 * @param max - Maximum value (string or number)
 * @throws Error if min > max when both are numeric
 */
const validateMinMaxRange = (min: any, max: any): void => {
  // Only validate if both values are numeric
  const minNum = typeof min === 'number' ? min : (typeof min === 'string' ? parseFloat(min) : NaN);
  const maxNum = typeof max === 'number' ? max : (typeof max === 'string' ? parseFloat(max) : NaN);

  // If both are valid numbers, check range
  if (!isNaN(minNum) && !isNaN(maxNum)) {
    if (minNum > maxNum) {
      throw new Error(`Min value (${minNum}) cannot be greater than Max value (${maxNum})`);
    }
  }
  // If one or both are strings like "Negative", skip validation
};

/**
 * GET /api/standards - List with search & pagination
 * Supports query parameter ?select=true for dropdown/select options
 */
export const getAllStandards = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if this is a select/dropdown request
    const isSelect = parseBooleanParam(req.query.select as string | string[] | undefined);

    if (isSelect) {
      // Return simplified data for dropdown/select
      const standards = await prisma.standart.findMany({
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
        data: standards
      });
      return;
    }

    // Standard list with pagination
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const search = sanitizeSearchQuery(typeof req.query.search === 'string' ? req.query.search : undefined);

    const where = {
      trash: null,
      ...buildMultiFieldSearchCondition(['name', 'code'], search),
    };

    const [data, total] = await Promise.all([
      prisma.standart.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              customer_name: true,
              code: true
            }
          },
          standartDetails: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.standart.count({ where })
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

    const data = await prisma.standart.findFirst({
      where: { id, trash: null },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        customer: {
          select: {
            id: true,
            customer_name: true,
            code: true
          }
        },
        standartDetails: {
          include: {
            service: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Standard not found'
      });
      return;
    }

    res.json({ success: true, data });
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

    // Check if code already exists
    const existingCode = await checkDuplicateCaseInsensitive(
      prisma.standart,
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
      prisma.standart,
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

    // Validate foreign keys if provided
    if (category_id) {
      const category = await prisma.category.findFirst({
        where: { id: category_id }
      });
      if (!category) {
        res.status(404).json({
          success: false,
          message: 'Category not found'
        });
        return;
      }
    }

    if (customer_id) {
      const customer = await prisma.customer.findFirst({
        where: { id: customer_id, trash: null }
      });
      if (!customer) {
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

      // Check if service exists
      const service = await prisma.service.findFirst({
        where: { id: detail.service_id, trash: null }
      });
      if (!service) {
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

    // Create standard with nested standartDetails using transaction for atomicity
    const data = await prisma.$transaction(async (tx) => {
      return await tx.standart.create({
        data: {
          code,
          name,
          category_id: category_id || null,
          customer_id: customer_id || null,
          created_by: createdBy,
          standartDetails: {
            create: standartDetailsData
          }
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              customer_name: true,
              code: true
            }
          },
          standartDetails: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true
                }
              }
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Standard created successfully',
      data
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

    // Check if standard exists
    const existingStandard = await prisma.standart.findFirst({
      where: { id, trash: null }
    });

    if (!existingStandard) {
      res.status(404).json({
        success: false,
        message: 'Standard not found'
      });
      return;
    }

    const {
      code,
      name,
      category_id,
      customer_id,
      standartDetails
    } = req.body;

    // Check if code is being changed and if it already exists
    if (code && code !== existingStandard.code) {
      const codeExists = await checkDuplicateCaseInsensitive(
        prisma.standart,
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
    if (name && name !== existingStandard.name) {
      const nameExists = await checkDuplicateCaseInsensitive(
        prisma.standart,
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

    // Validate foreign keys if provided
    if (category_id !== undefined) {
      if (category_id !== null) {
        const category = await prisma.category.findFirst({
          where: { id: category_id }
        });
        if (!category) {
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
        const customer = await prisma.customer.findFirst({
          where: { id: customer_id, trash: null }
        });
        if (!customer) {
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

        // Check if service exists
        const service = await prisma.service.findFirst({
          where: { id: detail.service_id, trash: null }
        });
        if (!service) {
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
    let standartDetailsData: any[] | undefined;
    if (standartDetails && Array.isArray(standartDetails)) {
      try {
        standartDetailsData = standartDetails.map((detail: any) => {
          // Parse min/max values (already validated above, but parse again to ensure consistency)
          const parsedMin = parseMinMaxValue(detail.min);
          const parsedMax = parseMinMaxValue(detail.max);
          return {
            standart_id: id,
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

    // Use transaction to update standard and standartDetails
    const result = await prisma.$transaction(async (tx) => {
      // Update standard
      await tx.standart.update({
        where: { id },
        data: updateData
      });

      // Handle standartDetails if provided
      if (standartDetailsData && standartDetailsData.length > 0) {
        // Delete existing standartDetails
        await tx.standartDetail.deleteMany({
          where: { standart_id: id }
        });

        // Create new standartDetails
        await tx.standartDetail.createMany({
          data: standartDetailsData
        });
      }

      // Return updated standard with relations
      return await tx.standart.findFirst({
        where: { id },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              customer_name: true,
              code: true
            }
          },
          standartDetails: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true
                }
              }
            }
          }
        }
      });
    });

    res.json({
      success: true,
      message: 'Standard updated successfully',
      data: result
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

    // Check if standard exists
    const existingStandard = await prisma.standart.findFirst({
      where: { id, trash: null }
    });

    if (!existingStandard) {
      res.status(404).json({
        success: false,
        message: 'Standard not found'
      });
      return;
    }

    // Soft delete
    await prisma.standart.update({
      where: { id },
      data: { trash: 1 }
    });

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

    // Build where condition
    const where: any = {
      trash: null
    };

    // Search filter (name or code)
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery } },
        { code: { contains: searchQuery } }
      ];
    }

    // Customer role filtering: if user is Customer role (role_id 16), filter by their customer_id
    if ((req as any).user?.role_id === 16 && (req as any).user?.customer_id) {
      where.customer_id = (req as any).user.customer_id;
    }

    const standards = await prisma.standart.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    const response: any = {
      total_count: standards.length,
      incomplete_results: false
    };

    // Use 'data' key if dataTable flag is set, otherwise use 'items'
    if (isDataTable) {
      response.data = standards;
    } else {
      response.items = standards;
    }

    res.json(response);
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
    const skip = (page - 1) * perPage;
    const searchQuery = sanitizeSearchQuery(typeof req.query.search === 'string' ? req.query.search : undefined);

    // Build where condition
    const where: any = {
      trash: null,
      ...buildMultiFieldSearchCondition(['name', 'code'], searchQuery)
    };

    // Handle order_by if provided (basic implementation)
    let orderBy: any = { id: 'desc' };
    if (typeof req.query.order_by === 'string' && req.query.order_by.trim()) {
      const orderParts = req.query.order_by.trim().split(' ');
      if (orderParts.length === 2) {
        const field = orderParts[0];
        const direction = orderParts[1].toLowerCase() === 'asc' ? 'asc' : 'desc';
        orderBy = { [field]: direction };
      }
    }

    const [standards, total] = await Promise.all([
      prisma.standart.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        select: {
          id: true,
          code: true,
          name: true,
          customer: {
            select: {
              id: true
            }
          }
        }
      }),
      prisma.standart.count({ where })
    ]);

    res.json({
      total_count: total,
      items: standards
    });
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

