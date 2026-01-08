import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/labs - List dengan search & pagination
 */
export const getAllLabs = async (req: Request, res: Response): Promise<void> => {
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
      prisma.lab.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' }
      }),
      prisma.lab.count({ where })
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
    console.error('getAll labs error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch labs',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/labs/:id
 */
export const getLabById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const data = await prisma.lab.findFirst({
      where: { id, trash: null }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Lab not found'
      });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('getById lab error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/labs
 */
export const createLab = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    // Check duplicate
    const existing = await checkDuplicateCaseInsensitive(
      prisma.lab,
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

    const data = await prisma.lab.create({
      data: {
        name: name.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Lab created successfully',
      data
    });
  } catch (error) {
    console.error('create lab error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create lab',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/labs/:id
 */
export const updateLab = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const { name } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
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

    // Check exists
    const existing = await prisma.lab.findFirst({
      where: { id, trash: null }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Lab not found'
      });
      return;
    }

    // Check duplicate
    const duplicate = await checkDuplicateCaseInsensitive(
      prisma.lab,
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

    const data = await prisma.lab.update({
      where: { id },
      data: {
        name: name.trim()
      }
    });

    res.json({
      success: true,
      message: 'Lab updated successfully',
      data
    });
  } catch (error) {
    console.error('update lab error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update lab',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/labs/:id
 */
export const deleteLab = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const existing = await prisma.lab.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Lab not found'
      });
      return;
    }

    await prisma.lab.update({
      where: { id },
      data: { trash: 1 }
    });

    res.json({
      success: true,
      message: 'Lab deleted successfully'
    });
  } catch (error) {
    console.error('delete lab error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete lab',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/labs/json - JSON API for autocomplete/select2
 */
export const getLabsJson = async (req: Request, res: Response): Promise<void> => {
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
      prisma.lab.findMany({
        where,
        select: {
          id: true,
          name: true
        },
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.lab.count({ where })
    ]);

    // JSON API Response Format
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
    console.error('getLabsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch labs',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};













