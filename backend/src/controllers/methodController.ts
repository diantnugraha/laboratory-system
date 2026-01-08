import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildMultiFieldSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * Helper: Generate method code in MTD.XXXXX format
 */
const generateMethodCode = async (): Promise<string> => {
  const lastMethod = await prisma.method.findFirst({
    where: { trash: null },
    orderBy: { code: 'desc' },
    select: { code: true }
  });

  if (!lastMethod || !lastMethod.code) {
    return 'MTD.00001';
  }

  const match = lastMethod.code.match(/^MTD\.(\d+)$/);
  if (!match) {
    return 'MTD.00001';
  }

  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;
  
  return `MTD.${nextNumber.toString().padStart(5, '0')}`;
};

/**
 * Helper: Generate hierarchical file path from ID
 * Format: /{milyar}/{juta}/{ribu}/{ratus}/
 * Example: id=1234567 → /00/001/234/567/
 * Note: This function will be used when file upload is implemented
 */
export const generateMethodPath = (id: number): string => {
  const idStr = id.toString();
  
  // Extract digit groups from right to left
  const ratus = idStr.slice(-3).padStart(3, '0');
  const ribu = idStr.length > 3
    ? idStr.slice(-6, -3).padStart(3, '0')
    : '000';
  const juta = idStr.length > 6
    ? idStr.slice(-9, -6).padStart(3, '0')
    : '000';
  const milyar = idStr.length > 9
    ? idStr.slice(-12, -9).padStart(2, '0')
    : '00';

  return `/${milyar}/${juta}/${ribu}/${ratus}/`;
};

/**
 * Helper: Handle method documents with ";;" delimiter
 */
const handleMethodDocuments = (
  existingDocuments: string | null | undefined,
  documentsToRemove: string[] | undefined,
  newDocument: string | null | undefined
): string | null => {
  let documents = existingDocuments ? existingDocuments.split(';;') : [];
  
  // Remove documents
  if (documentsToRemove && documentsToRemove.length > 0) {
    documents = documents.filter(doc => !documentsToRemove.includes(doc));
  }
  
  // Add new document
  if (newDocument) {
    documents.push(newDocument);
  }
  
  return documents.length > 0 ? documents.join(';;') : null;
};

/**
 * GET /api/methods - List dengan search & pagination
 */
export const getAllMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where = {
      trash: null,
      ...buildMultiFieldSearchCondition(['name', 'code'], search),
    };

    const [data, total] = await Promise.all([
      prisma.method.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: {
          matrix: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.method.count({ where })
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

    const data = await prisma.method.findFirst({
      where: { id, trash: null },
      include: {
        matrix: {
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
        message: 'Method not found'
      });
      return;
    }

    res.json({ success: true, data });
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

    // Validate required fields
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

    // Check matrix exists
    const matrix = await prisma.matrix.findFirst({
      where: { id: matrixIdNum, trash: null }
    });
    if (!matrix) {
      res.status(404).json({
        success: false,
        message: 'Matrix not found'
      });
      return;
    }

    // Check name uniqueness (BR-001)
    const duplicateName = await checkDuplicateCaseInsensitive(
      prisma.method,
      'name',
      name.trim()
    );
    if (duplicateName) {
      res.status(409).json({
        success: false,
        message: 'Name already exists'
      });
      return;
    }

    // Generate code automatically (BR-002)
    const code = await generateMethodCode();

    // Create method
    const data = await prisma.method.create({
      data: {
        code,
        name: name.trim(),
        matrix_id: matrixIdNum,
        category_name: category_name ? String(category_name).trim() : null,
        status: status.trim(),
        description: description ? String(description).trim() : null,
        instruction: instruction ? String(instruction).trim() : null,
        created_by: userId || null
      },
      include: {
        matrix: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

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

    // Check exists
    const existing = await prisma.method.findFirst({
      where: { id }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Method not found'
      });
      return;
    }

    // Handle soft delete (BR-003)
    if (deleteFlag === true || deleteFlag === '1' || deleteFlag === 1) {
      await prisma.method.update({
        where: { id },
        data: {
          trash: 1,
          updated_by: userId || null
        }
      });

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

    // Validate matrix exists if updating
    if (updateData.matrix_id) {
      const matrix = await prisma.matrix.findFirst({
        where: { id: updateData.matrix_id, trash: null }
      });
      if (!matrix) {
        res.status(404).json({
          success: false,
          message: 'Matrix not found'
        });
        return;
      }
    }

    // Check name uniqueness (BR-001)
    if (updateData.name) {
      const duplicateName = await checkDuplicateCaseInsensitive(
        prisma.method,
        'name',
        updateData.name,
        id
      );
      if (duplicateName) {
        res.status(409).json({
          success: false,
          message: 'Name already exists'
        });
        return;
      }
    }

    // Check code uniqueness if code provided (BR-002)
    if (updateData.code) {
      const duplicateCode = await checkDuplicateCaseInsensitive(
        prisma.method,
        'code',
        updateData.code,
        id
      );
      if (duplicateCode) {
        res.status(409).json({
          success: false,
          message: 'Code already exists'
        });
        return;
      }
    }

    // Handle document removal and addition (BR-005)
    const documentsToRemove = Array.isArray(document_file) ? document_file : 
                              document_file ? [document_file] : [];
    
    // TODO: Handle new file upload if multer is configured
    // const newFile = (req as any).file;
    // const newFileName = newFile ? await saveFile(newFile, generateMethodPath(id)) : null;
    
    const updatedDocuments = handleMethodDocuments(
      existing.method_document,
      documentsToRemove.length > 0 ? documentsToRemove : undefined,
      null // newFileName - uncomment when file upload is implemented
    );

    if (updatedDocuments !== undefined) {
      updateData.method_document = updatedDocuments;
    }

    updateData.updated_by = userId || null;

    const data = await prisma.method.update({
      where: { id },
      data: updateData,
      include: {
        matrix: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Method updated successfully',
      data
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

    const existing = await prisma.method.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Method not found'
      });
      return;
    }

    const userId = (req as any).user?.id;

    await prisma.method.update({
      where: { id },
      data: {
        trash: 1,
        updated_by: userId || null
      }
    });

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
    const q = searchTerm && 
      !['lab.tuv-nord.co.id', 'dev.tuv-nord.co.id'].includes(searchTerm)
        ? searchTerm
        : undefined;

    const where = {
      trash: null,
      ...(q && {
        name: {
          contains: q
        }
      })
    };

    // Page size: 20 (standard) or 1000 (dataTable mode) - fix unlimited issue
    const pageSize = isDataTable ? 1000 : 20;

    const methods = await prisma.method.findMany({
      where,
      take: pageSize,
      orderBy: { id: 'asc' },
      include: {
        matrix: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const items = methods.map(method => ({
      id: method.id,
      name: method.name,
      code: method.code,
      category_name: method.category_name,
      description: method.description,
      matrix: {
        id: method.matrix.id,
        name: method.matrix.name
      }
    }));

    const response = {
      total_count: items.length,
      incomplete_results: false,
      ...(isDataTable ? { data: items } : { items })
    };

    res.json(response);
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

    if (start) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      where.created_at = { ...where.created_at, gte: startDate };
    }

    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      where.created_at = { ...where.created_at, lte: endDate };
    }

    const methods = await prisma.method.findMany({
      where,
      orderBy: { id: 'asc' }
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

    const header = 'METHOD NAME,CODE,CATEGORY,DESCRIPTION\r\n';
    const rows = methods.map(m => 
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
