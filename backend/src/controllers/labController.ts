import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { LabRepository } from '../repositories/implementations/LabRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const labRepo = new LabRepository(prisma);

/**
 * GET /api/labs - List dengan search & pagination
 */
export const getAllLabs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Call repository
    const result = await labRepo.findAll({ search, page, limit });

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

    // Call repository
    const result = await labRepo.findById(id);

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

    // HTTP validation stays in controller
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    // Check duplicate via repository
    const duplicateResult = await labRepo.findByName(name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Create lab
    const result = await labRepo.create({ name: name.trim() });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Lab created successfully',
      data: result.getValue()
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

    // Check if lab exists using repository
    const labResult = await labRepo.findById(id);
    if (labResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Lab not found',
      });
      return;
    }

    // Check duplicate via repository
    const duplicateResult = await labRepo.findByName(name.trim(), id);
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Update lab
    const result = await labRepo.update(id, { name: name.trim() });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Lab updated successfully',
      data: result.getValue()
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

    // HTTP validation stays in controller
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if lab exists using repository
    const labResult = await labRepo.findById(id);
    if (labResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Lab not found',
      });
      return;
    }

    // Delete lab
    const result = await labRepo.delete(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

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
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    // Call repository
    const result = await labRepo.findForAutocomplete(search, isDataTable);

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
    console.error('getLabsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch labs',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
