import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CategoryRepository } from '../repositories/implementations/CategoryRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const categoryRepo = new CategoryRepository(prisma);

/**
 * GET /api/categories - List dengan search & pagination
 */
export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Call repository
    const result = await categoryRepo.findAll({ search, page, limit });

    // Handle repository result
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const data = result.getValue();

    // Return formatted response
    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination,
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

    // Call repository
    const result = await categoryRepo.findById(id);

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

    // HTTP validation stays in controller
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    // Check duplicate via repository
    const duplicateResult = await categoryRepo.findByName(name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Create category
    const result = await categoryRepo.create({ name: name.trim() });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.getValue()
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

    // HTTP validation stays in controller
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

    // Check if category exists using repository
    const categoryResult = await categoryRepo.findById(id);
    if (categoryResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    // Check duplicate via repository
    const duplicateResult = await categoryRepo.findByName(name.trim(), id);
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Update category
    const result = await categoryRepo.update(id, { name: name.trim() });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.getValue()
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

    // HTTP validation stays in controller
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if category exists using repository
    const categoryResult = await categoryRepo.findById(id);
    if (categoryResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    // Delete category
    const result = await categoryRepo.delete(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

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

