import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/analyst-types - List dengan search & pagination
 */
export const getAllAnalystTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where = {
      trash: null,
      ...buildSearchCondition('name', search),
    };

    const [data, total] = await Promise.all([
      prisma.analystType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          _count: {
            select: {
              analystRules: {
                where: {
                  trash: null,
                  user: { trash: null }
                }
              }
            }
          }
        }
      }),
      prisma.analystType.count({ where })
    ]);

    // Transform data to include analystCount (exclude _count field)
    const transformedData = data.map(item => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        analystCount: _count.analystRules
      };
    });

    const response: ApiResponse = {
      success: true,
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('getAll analyst types error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analyst types',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/analyst-types/:id
 */
export const getAnalystTypeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const data = await prisma.analystType.findFirst({
      where: { id, trash: null },
      include: {
        _count: {
          select: {
            analystRules: {
              where: {
                trash: null,
                user: { trash: null }
              }
            },
            services: {
              where: { trash: null }
            }
          }
        }
      }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Analyst type not found'
      });
      return;
    }

    // Transform data to include counts (exclude _count field)
    const { _count, ...rest } = data;
    const transformedData = {
      ...rest,
      analystCount: _count.analystRules,
      serviceCount: _count.services
    };

    res.json({ success: true, data: transformedData });
  } catch (error) {
    console.error('getById analyst type error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analyst type',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/analyst-types
 */
export const createAnalystType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, list_service } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    // Check duplicate
    const existing = await checkDuplicateCaseInsensitive(
      prisma.analystType,
      'name',
      name.trim()
    );
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    const data = await prisma.analystType.create({
      data: {
        name: name.trim(),
        list_service: typeof list_service === 'string' ? list_service.trim() || null : null,
        created_by: req.user?.id || 1
      }
    });

    res.status(201).json({
      success: true,
      message: 'Analyst type created successfully',
      data
    });
  } catch (error) {
    console.error('create analyst type error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create analyst type',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/analyst-types/:id
 */
export const updateAnalystType = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const { name, list_service } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check exists
    const existing = await prisma.analystType.findFirst({
      where: { id, trash: null }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Analyst type not found'
      });
      return;
    }

    const updateData: { name?: string; list_service?: string | null; updated_by?: number | null } = {};

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Name cannot be empty'
        });
        return;
      }
      updateData.name = name.trim();
    }

    if (list_service !== undefined) {
      updateData.list_service = typeof list_service === 'string' ? list_service.trim() || null : null;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid data to update'
      });
      return;
    }

    // Check duplicate
    if (updateData.name) {
      const duplicate = await checkDuplicateCaseInsensitive(
        prisma.analystType, 'name', updateData.name, id
      );
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    const data = await prisma.analystType.update({
      where: { id },
      data: {
        ...updateData,
        updated_by: req.user?.id || null
      }
    });

    res.json({
      success: true,
      message: 'Analyst type updated successfully',
      data
    });
  } catch (error) {
    console.error('update analyst type error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update analyst type',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/analyst-types/:id
 */
export const deleteAnalystType = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const existing = await prisma.analystType.findFirst({
      where: { id, trash: null },
      include: {
        _count: {
          select: {
            analystRules: {
              where: {
                trash: null,
                user: { trash: null }
              }
            },
            services: {
              where: { trash: null }
            }
          }
        }
      }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Analyst type not found'
      });
      return;
    }

    // Check for dependencies before deletion
    const analystCount = existing._count.analystRules;
    const serviceCount = existing._count.services;

    if (analystCount > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete: ${analystCount} analyst(s) are assigned to this type`
      });
      return;
    }

    if (serviceCount > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete: ${serviceCount} service(s) are linked to this type`
      });
      return;
    }

    await prisma.analystType.update({
      where: { id },
      data: { trash: 1 }
    });

    res.json({
      success: true,
      message: 'Analyst type deleted successfully'
    });
  } catch (error) {
    console.error('delete analyst type error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete analyst type',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/analyst-types/json - JSON API for dropdowns/autocomplete
 */
export const getAnalystTypesJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const isDataTable = req.query.dataTable !== undefined;
    
    // Fix unlimited page size issue - use max 1000 for dataTable mode
    const limit = isDataTable ? 1000 : 20;

    const where = {
      trash: null,
      ...buildSearchCondition('name', searchTerm),
    };

    const [items, total] = await Promise.all([
      prisma.analystType.findMany({
        where,
        select: {
          id: true,
          name: true
        },
        take: limit,
        orderBy: { id: 'asc' }
      }),
      prisma.analystType.count({ where })
    ]);

    // JSON API Response Format
    const response: any = {
      total_count: total,
      incomplete_results: total > limit
    };

    // Use 'data' for dataTable mode, 'items' for standard format
    if (isDataTable) {
      response.data = items;
    } else {
      response.items = items;
    }

    res.json(response);
  } catch (error) {
    console.error('getAnalystTypesJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analyst types JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/analyst-types/reverse - Migration utility to populate Service.analyst_type_id from AnalystType.list_service
 * WARNING: This is a one-time migration tool. Use with caution.
 */
export const reverseAnalystTypes = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Get all analyst types with list_service populated
    const analystTypes = await prisma.analystType.findMany({
      where: {
        trash: null,
        list_service: { not: null }
      },
      select: {
        id: true,
        name: true,
        list_service: true
      }
    });

    let totalProcessed = 0;
    const results: string[] = [];

    for (const analystType of analystTypes) {
      if (!analystType.list_service) continue;

      // Parse comma-separated service IDs (format: ",1,2,3,")
      const serviceIds = analystType.list_service
        .split(',')
        .map(id => id.trim())
        .filter(id => id && !isNaN(parseInt(id, 10)))
        .map(id => parseInt(id, 10));

      for (const serviceId of serviceIds) {
        try {
          // Check if service exists and is not already assigned
          const service = await prisma.service.findFirst({
            where: {
              id: serviceId,
              trash: null,
              analyst_type_id: null
            }
          });

          if (service) {
            await prisma.service.update({
              where: { id: serviceId },
              data: { analyst_type_id: analystType.id }
            });
            results.push(`${serviceId} : ${analystType.id}`);
            totalProcessed++;
          }
        } catch (error) {
          console.error(`Error updating service ${serviceId}:`, error);
          // Continue with other services
        }
      }
    }

    // Return HTML response as per specification
    res.setHeader('Content-Type', 'text/html');
    res.send(
      `start reverse<br>${results.join('<br>')}<br>total : ${totalProcessed}`
    );
  } catch (error) {
    console.error('reverseAnalystTypes error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to execute reverse migration',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};












