import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { ParameterRepository } from '../repositories/implementations/ParameterRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const parameterRepo = new ParameterRepository(prisma);

/**
 * GET /api/parameters - List dengan search & pagination
 */
export const getAllParameters = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Call repository
    const result = await parameterRepo.findAll({ search, page, limit });

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
    console.error('getAll parameters error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parameters',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/parameters/:id
 */
export const getParameterById = async (req: Request, res: Response): Promise<void> => {
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
    const result = await parameterRepo.findById(id);

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
    console.error('getById parameter error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parameter',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/parameters
 */
export const createParameter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, lab_id } = req.body;

    // HTTP validation stays in controller
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    const labIdNum = typeof lab_id === 'number' ? lab_id : parseId(String(lab_id));
    if (!labIdNum) {
      res.status(400).json({
        success: false,
        message: 'Lab ID is required'
      });
      return;
    }

    // Validate lab exists via repository
    const labValidation = await parameterRepo.validateLabExists(labIdNum);
    if (labValidation.isFailure()) {
      res.status(500).json({
        success: false,
        message: labValidation.error,
      });
      return;
    }

    if (!labValidation.getValue()) {
      res.status(404).json({
        success: false,
        message: 'Lab not found'
      });
      return;
    }

    // Check duplicate via repository
    const duplicateResult = await parameterRepo.findByName(name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Create parameter
    const result = await parameterRepo.create({ name: name.trim(), lab_id: labIdNum });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Parameter created successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('create parameter error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create parameter',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/parameters/:id
 */
export const updateParameter = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const { name, lab_id } = req.body;

    // HTTP validation stays in controller
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if parameter exists using repository
    const parameterResult = await parameterRepo.findById(id);
    if (parameterResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Parameter not found',
      });
      return;
    }

    const updateData: {
      name?: string;
      lab_id?: number;
    } = {};

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

    if (lab_id !== undefined) {
      const labIdNum = typeof lab_id === 'number' ? lab_id : parseId(String(lab_id));
      if (!labIdNum) {
        res.status(400).json({
          success: false,
          message: 'Invalid lab ID'
        });
        return;
      }
      updateData.lab_id = labIdNum;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid data to update'
      });
      return;
    }

    // Validate lab exists if updating lab_id
    if (updateData.lab_id) {
      const labValidation = await parameterRepo.validateLabExists(updateData.lab_id);
      if (labValidation.isFailure()) {
        res.status(500).json({
          success: false,
          message: labValidation.error,
        });
        return;
      }

      if (!labValidation.getValue()) {
        res.status(404).json({
          success: false,
          message: 'Lab not found'
        });
        return;
      }
    }

    // Check duplicate via repository
    if (updateData.name) {
      const duplicateResult = await parameterRepo.findByName(updateData.name, id);
      if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    // Update parameter
    const result = await parameterRepo.update(id, updateData);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Parameter updated successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('update parameter error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update parameter',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/parameters/:id
 */
export const deleteParameter = async (req: Request, res: Response): Promise<void> => {
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

    // Check if parameter exists using repository
    const parameterResult = await parameterRepo.findById(id);
    if (parameterResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Parameter not found',
      });
      return;
    }

    // Delete parameter
    const result = await parameterRepo.delete(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Parameter deleted successfully'
    });
  } catch (error) {
    console.error('delete parameter error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete parameter',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/parameters/json - JSON API for autocomplete/select2
 */
export const getParameterJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    // Call repository
    const result = await parameterRepo.findForAutocomplete(search, isDataTable);

    // Handle repository result
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const response = result.getValue();

    // Handle pretty print option (presentation logic in controller)
    if (req.query.pretty !== undefined) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(response, null, 2));
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('getParameterJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parameters JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/parameters/report - CSV export
 */
export const getParameterReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const start = typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;

    // Validate date format (YYYY-MM-DD) - HTTP validation in controller
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      res.status(400).json({
        success: false,
        message: 'Invalid start date format (expected YYYY-MM-DD)'
      });
      return;
    }

    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      res.status(400).json({
        success: false,
        message: 'Invalid end date format (expected YYYY-MM-DD)'
      });
      return;
    }

    // Repository provides data
    const result = await parameterRepo.findAllForReport();

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const parameters = result.getValue();

    // CSV formatting logic stays in controller (presentation layer)
    const escapeCSV = (value: string | null | undefined): string => {
      if (!value) return '';
      const str = String(value);
      // Escape double quotes and wrap in quotes if contains comma, newline, or quote
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = 'PARAMETER NAME,LAB NAME\r\n';
    const rows = parameters.map((p: any) =>
      `${escapeCSV(p.name)},${escapeCSV(p.lab?.name || '')}`
    ).join('\r\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report-parameter.csv"');
    res.send(csv);
  } catch (error) {
    console.error('getParameterReport error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
