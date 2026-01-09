import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { MatrixRepository } from '../repositories/implementations/MatrixRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const matrixRepo = new MatrixRepository(prisma);

/**
 * GET /api/matrices - List dengan search & pagination
 */
export const getAllMatrices = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Call repository
    const result = await matrixRepo.findAll({ search, page, limit });

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

    // Call repository
    const result = await matrixRepo.findById(id);

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

    // HTTP validation stays in controller
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

    // Check duplicate via repository
    const duplicateResult = await matrixRepo.findByName(name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Create matrix
    const result = await matrixRepo.create({ name: name.trim() });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Matrix created successfully',
      data: result.getValue()
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

    // HTTP validation stays in controller
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if matrix exists using repository
    const matrixResult = await matrixRepo.findById(id);
    if (matrixResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Matrix not found',
      });
      return;
    }

    // Support soft delete via delete flag - BR-002
    if (deleteFlag) {
      const result = await matrixRepo.delete(id);

      if (result.isFailure()) {
        res.status(500).json({
          success: false,
          message: result.error,
        });
        return;
      }

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

      // Check duplicate via repository
      const duplicateResult = await matrixRepo.findByName(name.trim(), id);
      if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    // Update matrix
    const result = await matrixRepo.update(id, { name: name !== undefined ? name.trim() : undefined });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Matrix updated successfully',
      data: result.getValue()
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

    // HTTP validation stays in controller
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if matrix exists using repository
    const matrixResult = await matrixRepo.findById(id);
    if (matrixResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Matrix not found',
      });
      return;
    }

    // Delete matrix
    const result = await matrixRepo.delete(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

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

    // Call repository
    const result = await matrixRepo.findForAutocomplete(search, isDataTable);

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
    console.error('getMatricesJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matrices',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
