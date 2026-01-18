import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { UnitRepository } from '../repositories/implementations/UnitRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';

// Initialize repository
const unitRepo = new UnitRepository(prisma);

/**
 * GET /api/units - List dengan search & pagination
 */
export const getAllUnits = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, unknown>;
    const page = parseQueryParam(query.page, 1);
    const limit = parseQueryParam(query.limit, 20);
    const search = typeof query.search === 'string' ? query.search : undefined;

    // Call repository
    const result = await unitRepo.findAll({ search, page, limit });

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const data = result.getValue();

    // Return formatted response
    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination,
    };

    return reply.send(response);
  } catch (error) {
    console.error('getAll units error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch units',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/units/:id
 */
export const getUnitById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, string>;
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Call repository
    const result = await unitRepo.findById(id);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getById unit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch unit',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/units
 */
export const createUnit = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const body = request.body as Record<string, unknown>;
    const { name, description, lab_id } = body;

    // BR-003: HTTP validation stays in controller
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Name is required'
      });
    }

    // BR-005: Name maximum length
    if (name.length > 255) {
      return reply.code(400).send({
        success: false,
        message: 'Name must be 255 characters or less'
      });
    }

    if (!description || typeof description !== 'string' || (description as string).trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Description is required'
      });
    }

    // BR-004: Validate lab_id if provided
    if (lab_id !== undefined && lab_id !== null) {
      const labIdNum = parseId(String(lab_id));
      if (!labIdNum) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid lab_id'
        });
      }

      // Validate lab exists via repository
      const labValidation = await unitRepo.validateLabExists(labIdNum);
      if (labValidation.isFailure()) {
        return reply.code(500).send({
          success: false,
          message: labValidation.error,
        });
      }

      if (!labValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Lab not found'
        });
      }
    }

    // BR-001: Check name uniqueness via repository
    const duplicateResult = await unitRepo.findByName(name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      return reply.code(409).send({
        success: false,
        message: 'Unit with this name already exists'
      });
    }

    // Create unit
    const result = await unitRepo.create({
      name: name.trim(),
      description: (description as string).trim(),
      lab_id: lab_id ? parseId(String(lab_id)) : null,
    });

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.code(201).send({
      success: true,
      message: 'Unit created successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('create unit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to create unit',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/units/:id
 */
export const updateUnit = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown>;
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    const { name, description, lab_id } = body;

    // Check if unit exists using repository
    const unitResult = await unitRepo.findById(id);
    if (unitResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Unit not found',
      });
    }

    const existing = unitResult.getValue();

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Name cannot be empty'
        });
      }

      if (name.length > 255) {
        return reply.code(400).send({
          success: false,
          message: 'Name must be 255 characters or less'
        });
      }

      // BR-001: Check name uniqueness (exclude current ID)
      if (name.trim() !== existing.name) {
        const duplicateResult = await unitRepo.findByName(name.trim(), id);
        if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
          return reply.code(409).send({
            success: false,
            message: 'Unit with this name already exists'
          });
        }
      }
    }

    // Validate description if provided
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Description cannot be empty'
        });
      }
    }

    // BR-004: Validate lab_id if provided
    if (lab_id !== undefined && lab_id !== null) {
      const labIdNum = parseId(String(lab_id));
      if (!labIdNum) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid lab_id'
        });
      }

      // Validate lab exists via repository
      const labValidation = await unitRepo.validateLabExists(labIdNum);
      if (labValidation.isFailure()) {
        return reply.code(500).send({
          success: false,
          message: labValidation.error,
        });
      }

      if (!labValidation.getValue()) {
        return reply.code(404).send({
          success: false,
          message: 'Lab not found'
        });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = (name as string).trim();
    if (description !== undefined) updateData.description = (description as string).trim();
    if (lab_id !== undefined) {
      updateData.lab_id = lab_id ? parseId(String(lab_id)) : null;
    }

    // Update unit
    const result = await unitRepo.update(id, updateData);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Unit updated successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('update unit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
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
export const deleteUnit = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, string>;
    const id = parseId(params.id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if unit exists using repository
    const unitResult = await unitRepo.findById(id);
    if (unitResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Unit not found',
      });
    }

    // BR-002: Hard delete via repository (Unit model doesn't have trash field)
    const result = await unitRepo.delete(id);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    console.error('delete unit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to delete unit',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/units/json - JSON API for autocomplete
 */
export const getUnitsJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, unknown>;
    const search = typeof query.q === 'string' ? query.q : undefined;
    const labIdParam = typeof query.lab_id === 'string' ? parseId(query.lab_id) : null;
    const labId = labIdParam !== null ? labIdParam : undefined;
    const isDataTable = query.dataTable !== undefined;

    // Call repository
    const result = await unitRepo.findForAutocomplete(search, labId, isDataTable);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send(result.getValue());
  } catch (error) {
    console.error('getUnitsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch units JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/units/report - CSV export
 */
export const getUnitsReport = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, unknown>;
    const start = typeof query.start === 'string' ? query.start : undefined;
    const end = typeof query.end === 'string' ? query.end : undefined;

    // Validate date format (YYYY-MM-DD) - HTTP validation in controller
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid start date format (expected YYYY-MM-DD)'
      });
    }

    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid end date format (expected YYYY-MM-DD)'
      });
    }

    // Repository provides data
    const result = await unitRepo.findAllForReport();

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
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

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="report-unit.csv"');
    return reply.send(csv);
  } catch (error) {
    console.error('getUnitsReport error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to generate report',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
