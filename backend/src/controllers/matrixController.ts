import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/matrices - List dengan search & pagination
 */
export const getAllMatrices = async (req: Request, res: Response): Promise<void> => {
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
      prisma.matrix.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' }
      }),
      prisma.matrix.count({ where })
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
    console.error('getAll matrices error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matrices',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/matrices/:id
 */
export const getMatrixById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const data = await prisma.matrix.findFirst({
      where: { id, trash: null }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Matrix not found'
      });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('getById matrix error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matrix',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/matrices
 */
export const createMatrix = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    if (name.trim().length > 255) {
      res.status(400).json({
        success: false,
        message: 'Name must be 255 characters or less'
      });
      return;
    }

    // Check duplicate (case-insensitive, exclude trash) - BR-001
    const existing = await checkDuplicateCaseInsensitive(
      prisma.matrix,
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

    const data = await prisma.matrix.create({
      data: {
        name: name.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Matrix created successfully',
      data
    });
  } catch (error) {
    console.error('create matrix error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create matrix',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/matrices/:id
 */
export const updateMatrix = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const { name, delete: deleteFlag } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check exists
    const existing = await prisma.matrix.findFirst({
      where: { id, trash: null }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Matrix not found'
      });
      return;
    }

    // Support soft delete via delete flag - BR-002
    if (deleteFlag) {
      await prisma.matrix.update({
        where: { id },
        data: { trash: 1 }
      });

      res.json({
        success: true,
        message: 'Matrix deleted successfully'
      });
      return;
    }

    // Validate name if provided
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Name is required'
        });
        return;
      }

      if (name.trim().length > 255) {
        res.status(400).json({
          success: false,
          message: 'Name must be 255 characters or less'
        });
        return;
      }

      // Check duplicate (exclude current record) - BR-001
      const duplicate = await checkDuplicateCaseInsensitive(
        prisma.matrix,
        'name',
        name.trim(),
        id
      );
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    const data = await prisma.matrix.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() })
      }
    });

    res.json({
      success: true,
      message: 'Matrix updated successfully',
      data
    });
  } catch (error) {
    console.error('update matrix error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update matrix',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/matrices/:id
 */
export const deleteMatrix = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const existing = await prisma.matrix.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Matrix not found'
      });
      return;
    }

    // Soft delete: set trash = 1 - BR-002
    await prisma.matrix.update({
      where: { id },
      data: { trash: 1 }
    });

    res.json({
      success: true,
      message: 'Matrix deleted successfully'
    });
  } catch (error) {
    console.error('delete matrix error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete matrix',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/matrices/json - JSON API for autocomplete/select2
 */
export const getMatricesJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const isDataTable = req.query.dataTable !== undefined;
    
    // Fix unlimited page size issue - use max 1000 for dataTable mode
    const limit = isDataTable ? 1000 : 20;

    const where = {
      trash: null,
      ...buildSearchCondition('name', search),
    };

    const [items, total] = await Promise.all([
      prisma.matrix.findMany({
        where,
        select: {
          id: true,
          name: true
        },
        take: limit,
        orderBy: { id: 'desc' }
      }),
      prisma.matrix.count({ where })
    ]);

    // BR-005: JSON API Response Format
    const response: any = {
      total_count: total,
      incomplete_results: false
    };

    // Use 'data' for dataTable mode, 'items' for standard format
    if (isDataTable) {
      response.data = items;
    } else {
      response.items = items;
    }

    res.json(response);
  } catch (error) {
    console.error('getMatricesJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matrices',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
