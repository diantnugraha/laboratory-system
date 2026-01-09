import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { UnitRepository } from '../repositories/implementations/UnitRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const unitRepo = new UnitRepository(prisma);

/**
 * GET /api/units - List dengan search & pagination
 */
export const getAllUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Call repository
    const result = await unitRepo.findAll({ search, page, limit });

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
    console.error('getAll units error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/units/:id
 */
export const getUnitById = async (req: Request, res: Response): Promise<void> => {
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
    const result = await unitRepo.findById(id);

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
    console.error('getById unit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unit',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/units
 */
export const createUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, lab_id } = req.body;

    // BR-003: HTTP validation stays in controller
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    // BR-005: Name maximum length
    if (name.length > 255) {
      res.status(400).json({
        success: false,
        message: 'Name must be 255 characters or less'
      });
      return;
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Description is required'
      });
      return;
    }

    // BR-004: Validate lab_id if provided
    if (lab_id !== undefined && lab_id !== null) {
      const labIdNum = parseId(String(lab_id));
      if (!labIdNum) {
        res.status(400).json({
          success: false,
          message: 'Invalid lab_id'
        });
        return;
      }

      // Validate lab exists via repository
      const labValidation = await unitRepo.validateLabExists(labIdNum);
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

    // BR-001: Check name uniqueness via repository
    const duplicateResult = await unitRepo.findByName(name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Unit with this name already exists'
      });
      return;
    }

    // Create unit
    const result = await unitRepo.create({
      name: name.trim(),
      description: description.trim(),
      lab_id: lab_id ? parseId(String(lab_id)) : null,
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
      message: 'Unit created successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('create unit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create unit',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/units/:id
 */
export const updateUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const { name, description, lab_id } = req.body;

    // Check if unit exists using repository
    const unitResult = await unitRepo.findById(id);
    if (unitResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
      return;
    }

    const existing = unitResult.getValue();

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Name cannot be empty'
        });
        return;
      }

      if (name.length > 255) {
        res.status(400).json({
          success: false,
          message: 'Name must be 255 characters or less'
        });
        return;
      }

      // BR-001: Check name uniqueness (exclude current ID)
      if (name.trim() !== existing.name) {
        const duplicateResult = await unitRepo.findByName(name.trim(), id);
        if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
          res.status(409).json({
            success: false,
            message: 'Unit with this name already exists'
          });
          return;
        }
      }
    }

    // Validate description if provided
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Description cannot be empty'
        });
        return;
      }
    }

    // BR-004: Validate lab_id if provided
    if (lab_id !== undefined && lab_id !== null) {
      const labIdNum = parseId(String(lab_id));
      if (!labIdNum) {
        res.status(400).json({
          success: false,
          message: 'Invalid lab_id'
        });
        return;
      }

      // Validate lab exists via repository
      const labValidation = await unitRepo.validateLabExists(labIdNum);
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

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (lab_id !== undefined) {
      updateData.lab_id = lab_id ? parseId(String(lab_id)) : null;
    }

    // Update unit
    const result = await unitRepo.update(id, updateData);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('update unit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update unit',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/units/:id
 * Note: Unit model doesn't have trash field in current schema, so this performs HARD DELETE
 * To enable soft delete, add trash field to Unit model in schema.prisma
 */
export const deleteUnit = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if unit exists using repository
    const unitResult = await unitRepo.findById(id);
    if (unitResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
      return;
    }

    // BR-002: Hard delete via repository (Unit model doesn't have trash field)
    const result = await unitRepo.delete(id);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    console.error('delete unit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete unit',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/units/json - JSON API for autocomplete
 */
export const getUnitsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const labIdParam = typeof req.query.lab_id === 'string' ? parseId(req.query.lab_id) : null;
    const labId = labIdParam !== null ? labIdParam : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    // Call repository
    const result = await unitRepo.findForAutocomplete(search, labId, isDataTable);

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
    console.error('getUnitsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/units/report - CSV export
 */
export const getUnitsReport = async (req: Request, res: Response): Promise<void> => {
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
    const result = await unitRepo.findAllForReport();

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const units = result.getValue();

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

    const header = 'UNIT NAME,DESCRIPTION\r\n';
    const rows = units.map((u: any) =>
      `${escapeCSV(u.name)},${escapeCSV(u.description || '')}`
    ).join('\r\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report-unit.csv"');
    res.send(csv);
  } catch (error) {
    console.error('getUnitsReport error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
