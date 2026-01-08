import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/parameters - List dengan search & pagination
 */
export const getAllParameters = async (req: Request, res: Response): Promise<void> => {
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
      prisma.parameter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          lab: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.parameter.count({ where })
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

    const data = await prisma.parameter.findFirst({
      where: { id, trash: null },
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
        message: 'Parameter not found'
      });
      return;
    }

    res.json({ success: true, data });
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

    // Check lab exists
    const lab = await prisma.lab.findFirst({
      where: { id: labIdNum, trash: null }
    });
    if (!lab) {
      res.status(404).json({
        success: false,
        message: 'Lab not found'
      });
      return;
    }

    // Check duplicate
    const existing = await checkDuplicateCaseInsensitive(
      prisma.parameter,
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

    const data = await prisma.parameter.create({
      data: {
        name: name.trim(),
        lab_id: labIdNum
      },
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
      message: 'Parameter created successfully',
      data
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

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check exists
    const existing = await prisma.parameter.findFirst({
      where: { id, trash: null }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Parameter not found'
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

    // Check lab exists if updating lab_id
    if (updateData.lab_id) {
      const lab = await prisma.lab.findFirst({
        where: { id: updateData.lab_id, trash: null }
      });
      if (!lab) {
        res.status(404).json({
          success: false,
          message: 'Lab not found'
        });
        return;
      }
    }

    // Check duplicate
    if (updateData.name) {
      const duplicate = await checkDuplicateCaseInsensitive(
        prisma.parameter, 'name', updateData.name, id
      );
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    const data = await prisma.parameter.update({
      where: { id },
      data: {
        ...updateData
      },
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
      message: 'Parameter updated successfully',
      data
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

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const existing = await prisma.parameter.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Parameter not found'
      });
      return;
    }

    await prisma.parameter.update({
      where: { id },
      data: { trash: 1 }
    });

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
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const isDataTable = req.query.dataTable !== undefined;
    
    const where = {
      trash: null,
      ...buildSearchCondition('name', searchTerm)
    };

    // Page size: 20 (standard) or 1000 (dataTable mode)
    const pageSize = isDataTable ? 1000 : 20;

    const parameters = await prisma.parameter.findMany({
      where,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: {
        lab: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const items = parameters.map(parameter => ({
      id: parameter.id,
      name: parameter.name,
      lab: {
        id: parameter.lab.id,
        name: parameter.lab.name
      }
    }));

    const response = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
    };

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

    const where: any = {
      trash: null
    };

    // Date filters are included for future compatibility
    // Note: Parameter model may not have created_at field, but keeping for consistency
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

    const parameters = await prisma.parameter.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        lab: {
          select: {
            id: true,
            name: true
          }
        }
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

    const header = 'PARAMETER NAME,LAB NAME\r\n';
    const rows = parameters.map(p => 
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

