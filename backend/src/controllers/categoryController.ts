import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/categories - List dengan search & pagination
 */
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
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
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' }
      }),
      prisma.category.count({ where })
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
    console.error('getAll categories error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/categories/:id
 */
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const data = await prisma.category.findFirst({
      where: { id, trash: null }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('getById category error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/categories
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
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
      prisma.category,
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

    const data = await prisma.category.create({
      data: {
        name: name.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data
    });
  } catch (error) {
    console.error('create category error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/categories/:id
 */
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
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
    const existing = await prisma.category.findFirst({
      where: { id, trash: null }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    // Check duplicate
    const duplicate = await checkDuplicateCaseInsensitive(
      prisma.category,
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

    const data = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim()
      }
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data
    });
  } catch (error) {
    console.error('update category error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/categories/:id
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const existing = await prisma.category.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    await prisma.category.update({
      where: { id },
      data: { trash: 1 }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('delete category error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

