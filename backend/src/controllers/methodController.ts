import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { MethodRepository } from '../repositories/implementations/MethodRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';
import { generateMethodPath } from '../utils/methodHelper';

// Initialize repository
const methodRepo = new MethodRepository(prisma);

/**
 * GET /api/methods - List dengan search & pagination
 */
export const getAllMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    // Call repository
    const result = await methodRepo.findAll({ search, page, limit });

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
    console.error('getAll methods error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch methods',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/methods/:id
 */
export const getMethodById = async (req: Request, res: Response): Promise<void> => {
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
    const result = await methodRepo.findById(id);

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
    console.error('getById method error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch method',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/methods
 */
export const createMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, matrix_id, category_name, status, description, instruction } = req.body;
    const userId = (req as any).user?.id;

    // HTTP validation stays in controller
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Name is required'
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

    const matrixIdNum = typeof matrix_id === 'number' ? matrix_id : parseId(String(matrix_id));
    if (!matrixIdNum) {
      res.status(400).json({
        success: false,
        message: 'Matrix ID is required'
      });
      return;
    }

    if (!status || typeof status !== 'string' || status.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Status is required'
      });
      return;
    }

    // Validate matrix exists via repository
    const matrixValidation = await methodRepo.validateMatrixExists(matrixIdNum);
    if (matrixValidation.isFailure()) {
      res.status(500).json({
        success: false,
        message: matrixValidation.error,
      });
      return;
    }

    if (!matrixValidation.getValue()) {
      res.status(404).json({
        success: false,
        message: 'Matrix not found'
      });
      return;
    }

    // Check name uniqueness via repository
    const duplicateName = await methodRepo.findByName(name.trim());
    if (duplicateName.isSuccess() && duplicateName.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Generate code automatically via repository
    const codeResult = await methodRepo.generateNextCode();
    if (codeResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: codeResult.error,
      });
      return;
    }

    const code = codeResult.getValue();

    // Create method via repository
    const result = await methodRepo.create({
      code,
      name: name.trim(),
      matrix_id: matrixIdNum,
      category_name: category_name ? String(category_name).trim() : null,
      status: status.trim(),
      description: description ? String(description).trim() : null,
      instruction: instruction ? String(instruction).trim() : null,
    }, userId);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const data = result.getValue();

    // TODO: Handle file upload if multer is configured
    // const file = (req as any).file;
    // if (file) {
    //   const filePath = generateMethodPath(data.id);
    //   // Save file and update method_document
    // }

    res.status(201).json({
      success: true,
      message: 'Method created successfully',
      data
    });
  } catch (error) {
    console.error('create method error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create method',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/methods/:id
 */
export const updateMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const { name, code, matrix_id, category_name, status, description, instruction, delete: deleteFlag, document_file } = req.body;
    const userId = (req as any).user?.id;

    // Check if method exists using repository
    const existingResult = await methodRepo.findById(id);
    if (existingResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Method not found',
      });
      return;
    }

    const existing = existingResult.getValue();

    // Handle soft delete via repository
    if (deleteFlag === true || deleteFlag === '1' || deleteFlag === 1) {
      const deleteResult = await methodRepo.delete(id, userId);

      if (deleteResult.isFailure()) {
        res.status(500).json({
          success: false,
          message: deleteResult.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Method deleted successfully'
      });
      return;
    }

    // Prepare update data
    const updateData: any = {};

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim() === '') {
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
      updateData.name = name.trim();
    }

    if (code !== undefined && code !== null) {
      if (typeof code !== 'string' || code.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Code cannot be empty'
        });
        return;
      }
      if (code.length > 255) {
        res.status(400).json({
          success: false,
          message: 'Code must be 255 characters or less'
        });
        return;
      }
      updateData.code = code.trim();
    }

    if (matrix_id !== undefined) {
      const matrixIdNum = typeof matrix_id === 'number' ? matrix_id : parseId(String(matrix_id));
      if (!matrixIdNum) {
        res.status(400).json({
          success: false,
          message: 'Invalid matrix ID'
        });
        return;
      }
      updateData.matrix_id = matrixIdNum;
    }

    if (status !== undefined) {
      if (!status || typeof status !== 'string' || status.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Status cannot be empty'
        });
        return;
      }
      updateData.status = status.trim();
    }

    if (category_name !== undefined) {
      updateData.category_name = category_name ? String(category_name).trim() : null;
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    if (instruction !== undefined) {
      updateData.instruction = instruction ? String(instruction).trim() : null;
    }

    // Validate matrix exists if updating via repository
    if (updateData.matrix_id) {
      const matrixValidation = await methodRepo.validateMatrixExists(updateData.matrix_id);
      if (matrixValidation.isFailure()) {
        res.status(500).json({
          success: false,
          message: matrixValidation.error,
        });
        return;
      }

      if (!matrixValidation.getValue()) {
        res.status(404).json({
          success: false,
          message: 'Matrix not found'
        });
        return;
      }
    }

    // Check name uniqueness via repository
    if (updateData.name) {
      const duplicateName = await methodRepo.findByName(updateData.name, id);
      if (duplicateName.isSuccess() && duplicateName.getValue() !== null) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    // Check code uniqueness via repository
    if (updateData.code) {
      const duplicateCode = await methodRepo.findByCode(updateData.code, id);
      if (duplicateCode.isSuccess() && duplicateCode.getValue() !== null) {
        res.status(409).json({
          success: false,
          message: 'Code already exists'
        });
        return;
      }
    }

    // Handle document removal and addition via repository
    const documentsToRemove = Array.isArray(document_file) ? document_file.join(';;') :
                              document_file ? document_file : null;

    // TODO: Handle new file upload if multer is configured
    // const newFile = (req as any).file;
    // const newFileName = newFile ? await saveFile(newFile, generateMethodPath(id)) : null;

    const updatedDocuments = methodRepo.handleDocuments(
      existing.method_document,
      documentsToRemove,
      null // newFileName - uncomment when file upload is implemented
    );

    if (updatedDocuments !== undefined) {
      updateData.method_document = updatedDocuments;
    }

    // Update method via repository
    const result = await methodRepo.update(id, updateData, userId);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Method updated successfully',
      data: result.getValue()
    });
  } catch (error) {
    console.error('update method error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update method',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/methods/:id
 */
export const deleteMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if method exists using repository
    const existingResult = await methodRepo.findById(id);
    if (existingResult.isFailure()) {
      res.status(404).json({
        success: false,
        message: 'Method not found',
      });
      return;
    }

    const userId = (req as any).user?.id;

    // Delete method via repository
    const result = await methodRepo.delete(id, userId);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Method deleted successfully'
    });
  } catch (error) {
    console.error('delete method error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete method',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/methods/json - JSON API for autocomplete/select2
 */
export const getMethodsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    const isDataTable = req.query.dataTable !== undefined;

    // Filter out bizarre domain check from spec
    const search = searchTerm &&
      !['lab.tuv-nord.co.id', 'dev.tuv-nord.co.id'].includes(searchTerm)
        ? searchTerm
        : undefined;

    // Call repository
    const result = await methodRepo.findForAutocomplete(search, isDataTable);

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
    console.error('getMethodsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch methods JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/methods/report - CSV export
 */
export const getMethodsReport = async (req: Request, res: Response): Promise<void> => {
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
    const result = await methodRepo.findAllForReport(start, end);

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const methods = result.getValue();

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

    const header = 'METHOD NAME,CODE,CATEGORY,DESCRIPTION\r\n';
    const rows = methods.map((m: any) =>
      `${escapeCSV(m.name)},${escapeCSV(m.code)},${escapeCSV(m.category_name)},${escapeCSV(m.description)}`
    ).join('\r\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report-method.csv"');
    res.send(csv);
  } catch (error) {
    console.error('getMethodsReport error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

// Export generateMethodPath utility for external use (e.g., file uploads)
export { generateMethodPath };
