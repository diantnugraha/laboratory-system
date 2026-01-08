import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/units - List dengan search & pagination
 */
export const getAllUnits = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where = {
      ...buildSearchCondition('name', search),
    };

    const [data, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          lab: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.unit.count({ where })
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

    const data = await prisma.unit.findFirst({
      where: { id },
      include: {
        lab: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
      return;
    }

    res.json({ success: true, data });
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

    // BR-003: Validate required fields
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

      const labExists = await prisma.lab.findFirst({
        where: { id: labIdNum, trash: null }
      });
      if (!labExists) {
        res.status(404).json({
          success: false,
          message: 'Lab not found'
        });
        return;
      }
    }

    // BR-001: Check name uniqueness (case-insensitive)
    // Note: Unit model doesn't have trash field, so we check all records
    const duplicateName = await checkDuplicateCaseInsensitive(
      prisma.unit,
      'name',
      name.trim()
    );
    if (duplicateName) {
      res.status(409).json({
        success: false,
        message: 'Unit with this name already exists'
      });
      return;
    }

    const createData: any = {
      name: name.trim(),
      description: description.trim(),
      lab_id: lab_id ? parseId(String(lab_id)) : null,
    };

    const data = await prisma.unit.create({
      data: createData,
      include: {
        lab: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data
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

    // Check if unit exists
    const existing = await prisma.unit.findFirst({
      where: { id }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
      return;
    }

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
        const duplicateName = await checkDuplicateCaseInsensitive(
          prisma.unit,
          'name',
          name.trim(),
          id
        );
        if (duplicateName) {
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

      const labExists = await prisma.lab.findFirst({
        where: { id: labIdNum, trash: null }
      });
      if (!labExists) {
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

    const data = await prisma.unit.update({
      where: { id },
      data: updateData,
      include: {
        lab: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data
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

    const existing = await prisma.unit.findFirst({
      where: { id }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
      return;
    }

    // BR-002: Hard delete (Unit model doesn't have trash field in current schema)
    // TODO: Add trash field to Unit model for soft delete consistency
    await prisma.unit.delete({
      where: { id }
    });

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
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const labId = typeof req.query.lab_id === 'string' ? parseId(req.query.lab_id) : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    // Filter out bizarre domain check from spec
    const q = searchTerm && 
      !['lab.tuv-nord.co.id', 'dev.tuv-nord.co.id'].includes(searchTerm)
        ? searchTerm
        : undefined;

    const where: any = {
      ...(q && buildSearchCondition('name', q)),
      ...(labId && { lab_id: labId })
    };

    // Page size: 20 (standard) or 1000 (dataTable mode)
    const pageSize = isDataTable ? 1000 : 20;

    const units = await prisma.unit.findMany({
      where,
      take: pageSize,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true
      }
    });

    // FIX BUG: Return actual ID, not name (original PHP bug)
    const items = units.map(unit => ({
      id: unit.id,  // Fixed: was returning name in original PHP
      name: unit.name
    }));

    const response: any = {
      total_count: items.length,
      incomplete_results: false
    };

    if (isDataTable) {
      response.data = items;
    } else {
      response.items = items;
    }

    res.json(response);
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

    // Validate date format (YYYY-MM-DD)
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

    const where: any = {};

    // Note: Unit model doesn't have created_at field in current schema
    // Date filters are included for future compatibility
    // TODO: Add created_at field to Unit model if date filtering is needed
    if (start || end) {
      // If schema has created_at, uncomment and use:
      // const startDate = start ? new Date(start) : undefined;
      // const endDate = end ? new Date(end) : undefined;
      // if (startDate) {
      //   startDate.setHours(0, 0, 0, 0);
      //   where.created_at = { ...where.created_at, gte: startDate };
      // }
      // if (endDate) {
      //   endDate.setHours(23, 59, 59, 999);
      //   where.created_at = { ...where.created_at, lte: endDate };
      // }
    }

    const units = await prisma.unit.findMany({
      where,
      orderBy: { id: 'asc' },
      select: {
        name: true,
        description: true
      }
    });

    // Generate CSV
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
    const rows = units.map(u =>
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
