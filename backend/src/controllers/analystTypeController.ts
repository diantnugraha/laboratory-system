import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AnalystTypeRepository } from '../repositories/implementations/AnalystTypeRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const analystTypeRepo = new AnalystTypeRepository(prisma);

/**
 * GET /api/analyst-types - List dengan search & pagination
 */
export const getAllAnalystTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Call repository
    const result = await analystTypeRepo.findAll({ search, page, limit });

    // Handle repository result
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const data = result.getValue();

    // Transform data to include analystCount (exclude _count field)
    const transformedData = data.data.map(item => {
      const { _count, ...rest } = item;
      return {
        ...rest,
        analystCount: _count.analystRules
      };
    });

    const response: ApiResponse = {
      success: true,
      data: transformedData,
      pagination: data.pagination,
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

    // Call repository
    const result = await analystTypeRepo.findById(id);

    // Handle repository result
    if (result.isFailure()) {
      res.status(404).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const data = result.getValue();

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

    // Check duplicate via repository
    const duplicateResult = await analystTypeRepo.findByName(name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue()) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Create analyst type via repository
    const result = await analystTypeRepo.create({
      name: name.trim(),
      list_service: typeof list_service === 'string' ? list_service.trim() || null : null,
      created_by: req.user?.id || 1
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
      message: 'Analyst type created successfully',
      data: result.getValue(),
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

    // Check exists via repository
    const existingResult = await analystTypeRepo.findById(id);
    if (existingResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Analyst type not found',
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

    // Check duplicate via repository
    if (updateData.name) {
      const duplicateResult = await analystTypeRepo.findByName(updateData.name, id);
      if (duplicateResult.isSuccess() && duplicateResult.getValue()) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    // Update via repository
    updateData.updated_by = req.user?.id || null;
    const result = await analystTypeRepo.update(id, updateData);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Analyst type updated successfully',
      data: result.getValue(),
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

    // Check dependencies via repository
    const dependencyResult = await analystTypeRepo.checkDependencies(id);

    if (dependencyResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: dependencyResult.error,
      });
      return;
    }

    const dependencies = dependencyResult.getValue();

    // Check for dependencies before deletion
    if (dependencies.analystCount > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete: ${dependencies.analystCount} analyst(s) are assigned to this type`
      });
      return;
    }

    if (dependencies.serviceCount > 0) {
      res.status(409).json({
        success: false,
        message: `Cannot delete: ${dependencies.serviceCount} service(s) are linked to this type`
      });
      return;
    }

    // Delete via repository
    const result = await analystTypeRepo.delete(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

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

    // Call repository
    const result = await analystTypeRepo.findForAutocomplete(searchTerm, isDataTable);

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
    // Call repository for migration
    const result = await analystTypeRepo.performReverseMigration();

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const { results, totalProcessed } = result.getValue();

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
