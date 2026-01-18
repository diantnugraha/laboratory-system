import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { ParameterRepository } from '../repositories/implementations/ParameterRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';

// Initialize repository
const parameterRepo = new ParameterRepository(prisma);

/**
 * GET /api/parameters - List dengan search & pagination
 */
export const getAllParameters = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, unknown>;
    const page = parseQueryParam(query.page, 1);
    const limit = parseQueryParam(query.limit, 20);
    const search = typeof query.search === 'string' ? query.search : undefined;

    // Call repository
    const result = await parameterRepo.findAll({ search, page, limit });

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
    console.error('getAll parameters error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch parameters',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/parameters/:id
 */
export const getParameterById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
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
    const result = await parameterRepo.findById(id);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getById parameter error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch parameter',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/parameters
 */
export const createParameter = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const body = request.body as Record<string, unknown>;
    const { name, lab_id } = body;

    // HTTP validation stays in controller
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Name is required'
      });
    }

    const labIdNum = typeof lab_id === 'number' ? lab_id : parseId(String(lab_id));
    if (!labIdNum) {
      return reply.code(400).send({
        success: false,
        message: 'Lab ID is required'
      });
    }

    // Validate lab exists via repository
    const labValidation = await parameterRepo.validateLabExists(labIdNum);
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

    // Check duplicate via repository
    const duplicateResult = await parameterRepo.findByName(name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
      return reply.code(409).send({
        success: false,
        message: 'Name already exists'
      });
    }

    // Create parameter
    const result = await parameterRepo.create({ name: name.trim(), lab_id: labIdNum });

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.code(201).send({
      success: true,
      message: 'Parameter created successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('create parameter error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to create parameter',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/parameters/:id
 */
export const updateParameter = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown>;
    const id = parseId(params.id);
    const { name, lab_id } = body;

    // HTTP validation stays in controller
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if parameter exists using repository
    const parameterResult = await parameterRepo.findById(id);
    if (parameterResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Parameter not found',
      });
    }

    const updateData: {
      name?: string;
      lab_id?: number;
    } = {};

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Name cannot be empty'
        });
      }
      updateData.name = name.trim();
    }

    if (lab_id !== undefined) {
      const labIdNum = typeof lab_id === 'number' ? lab_id : parseId(String(lab_id));
      if (!labIdNum) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid lab ID'
        });
      }
      updateData.lab_id = labIdNum;
    }

    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({
        success: false,
        message: 'No valid data to update'
      });
    }

    // Validate lab exists if updating lab_id
    if (updateData.lab_id) {
      const labValidation = await parameterRepo.validateLabExists(updateData.lab_id);
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

    // Check duplicate via repository
    if (updateData.name) {
      const duplicateResult = await parameterRepo.findByName(updateData.name, id);
      if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
        return reply.code(409).send({
          success: false,
          message: 'Name already exists'
        });
      }
    }

    // Update parameter
    const result = await parameterRepo.update(id, updateData);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Parameter updated successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('update parameter error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to update parameter',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/parameters/:id
 */
export const deleteParameter = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as Record<string, string>;
    const id = parseId(params.id);

    // HTTP validation stays in controller
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check if parameter exists using repository
    const parameterResult = await parameterRepo.findById(id);
    if (parameterResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Parameter not found',
      });
    }

    // Delete parameter
    const result = await parameterRepo.delete(id);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Parameter deleted successfully'
    });
  } catch (error) {
    console.error('delete parameter error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to delete parameter',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/parameters/json - JSON API for autocomplete/select2
 */
export const getParameterJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const query = request.query as Record<string, unknown>;
    const search = typeof query.q === 'string' ? query.q : undefined;
    const isDataTable = query.dataTable !== undefined;

    // Call repository
    const result = await parameterRepo.findForAutocomplete(search, isDataTable);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const response = result.getValue();

    // Handle pretty print option (presentation logic in controller)
    if (query.pretty !== undefined) {
      reply.header('Content-Type', 'application/json');
      return reply.send(JSON.stringify(response, null, 2));
    } else {
      return reply.send(response);
    }
  } catch (error) {
    console.error('getParameterJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch parameters JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/parameters/report - CSV export
 */
export const getParameterReport = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
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
    const result = await parameterRepo.findAllForReport();

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
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

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="report-parameter.csv"');
    return reply.send(csv);
  } catch (error) {
    console.error('getParameterReport error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to generate report',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
