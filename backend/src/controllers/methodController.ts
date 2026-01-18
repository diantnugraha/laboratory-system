import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { MethodRepository } from '../repositories/implementations/MethodRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';
import { generateMethodPath } from '../utils/methodHelper.js';
import { AppError } from '../middleware/errorHandler.js';
import { isIgnoredDomain } from '../config/method.js';
import { CreateMethodInput, UpdateMethodInput, MethodJsonQuery, MethodReportQuery } from '../validators/method.js';

// Initialize repository
const methodRepo = new MethodRepository(prisma);

/**
 * GET /api/methods - List with search & pagination
 * Validation handled by middleware: paginationSchema
 */
export const getAllMethods = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const page = parseQueryParam((request.query as any).page, 1);
  const limit = parseQueryParam((request.query as any).limit, 20);
  const search = typeof (request.query as any).search === 'string' ? (request.query as any).search : undefined;

  const result = await methodRepo.findAll({ search, page, limit });

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch methods');
  }

  const data = result.getValue();

  const response: ApiResponse = {
    success: true,
    data: data.data,
    pagination: data.pagination,
  };

  return reply.send(response);
};

/**
 * GET /api/methods/:id
 * Validation handled by middleware: idParamSchema
 */
export const getMethodById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const id = parseId((request.params as any).id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  const result = await methodRepo.findById(id);

  if (result.isFailure()) {
    throw new AppError(404, result.error || 'Method not found');
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/methods
 * Validation handled by middleware: createMethodSchema
 */
export const createMethod = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  // Body is pre-validated by Zod middleware
  const body = request.body as CreateMethodInput;
  const userId = (request as any).user?.id;

  // PERFORMANCE: Run independent validations in parallel
  const [matrixValidation, duplicateName] = await Promise.all([
    methodRepo.validateMatrixExists(body.matrix_id),
    methodRepo.findByName(body.name)
  ]);

  // Check matrix validation result
  if (matrixValidation.isFailure()) {
    throw new AppError(500, matrixValidation.error || 'Failed to validate matrix');
  }
  if (!matrixValidation.getValue()) {
    throw new AppError(404, 'Matrix not found');
  }

  // Check name uniqueness result
  if (duplicateName.isSuccess() && duplicateName.getValue() !== null) {
    throw new AppError(409, 'Name already exists');
  }

  // Generate code atomically via repository (race-condition safe)
  const codeResult = await methodRepo.generateNextCode();
  if (codeResult.isFailure()) {
    throw new AppError(500, codeResult.error || 'Failed to generate code');
  }

  const code = codeResult.getValue();

  // Create method via repository
  const result = await methodRepo.create({
    code,
    name: body.name,
    matrix_id: body.matrix_id,
    category_name: body.category_name ?? null,
    status: body.status,
    description: body.description ?? null,
    instruction: body.instruction ?? null,
  }, userId);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to create method');
  }

  return reply.code(201).send({
    success: true,
    message: 'Method created successfully',
    data: result.getValue()
  });
};

/**
 * PUT /api/methods/:id
 * Validation handled by middleware: validateRequest({ params: idParamSchema, body: updateMethodSchema })
 */
export const updateMethod = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const id = parseId((request.params as any).id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  // Body is pre-validated by Zod middleware
  const body = request.body as UpdateMethodInput;
  const userId = (request as any).user?.id;

  // Check if method exists using repository
  const existingResult = await methodRepo.findById(id);
  if (existingResult.isFailure()) {
    throw new AppError(404, 'Method not found');
  }

  const existing = existingResult.getValue();

  // Handle soft delete via repository
  if (body.delete === true) {
    const deleteResult = await methodRepo.delete(id, userId);

    if (deleteResult.isFailure()) {
      throw new AppError(500, deleteResult.error || 'Failed to delete method');
    }

    return reply.send({
      success: true,
      message: 'Method deleted successfully'
    });
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    updateData.name = body.name;
  }

  if (body.code !== undefined) {
    updateData.code = body.code;
  }

  if (body.matrix_id !== undefined) {
    updateData.matrix_id = body.matrix_id;
  }

  if (body.status !== undefined) {
    updateData.status = body.status;
  }

  if (body.category_name !== undefined) {
    updateData.category_name = body.category_name;
  }

  if (body.description !== undefined) {
    updateData.description = body.description;
  }

  if (body.instruction !== undefined) {
    updateData.instruction = body.instruction;
  }

  // PERFORMANCE: Build validation promises based on what's being updated
  // Only validate matrix if actually changing to a DIFFERENT matrix
  const needsMatrixValidation = updateData.matrix_id && updateData.matrix_id !== existing.matrix_id;
  const needsNameValidation = !!updateData.name;
  const needsCodeValidation = !!updateData.code;

  // Run all applicable validations in parallel
  const validationPromises: Promise<any>[] = [];
  if (needsMatrixValidation) {
    validationPromises.push(methodRepo.validateMatrixExists(updateData.matrix_id as number));
  }
  if (needsNameValidation) {
    validationPromises.push(methodRepo.findByName(updateData.name as string, id));
  }
  if (needsCodeValidation) {
    validationPromises.push(methodRepo.findByCode(updateData.code as string, id));
  }

  // Execute all validations in parallel
  const validationResults = await Promise.all(validationPromises);

  // Process validation results
  let resultIndex = 0;

  if (needsMatrixValidation) {
    const matrixValidation = validationResults[resultIndex++];
    if (matrixValidation.isFailure()) {
      throw new AppError(500, matrixValidation.error || 'Failed to validate matrix');
    }
    if (!matrixValidation.getValue()) {
      throw new AppError(404, 'Matrix not found');
    }
  }

  if (needsNameValidation) {
    const duplicateName = validationResults[resultIndex++];
    if (duplicateName.isSuccess() && duplicateName.getValue() !== null) {
      throw new AppError(409, 'Name already exists');
    }
  }

  if (needsCodeValidation) {
    const duplicateCode = validationResults[resultIndex++];
    if (duplicateCode.isSuccess() && duplicateCode.getValue() !== null) {
      throw new AppError(409, 'Code already exists');
    }
  }

  // Handle document removal and addition via repository
  const documentsToRemove = Array.isArray(body.document_file)
    ? body.document_file.join(';;')
    : body.document_file ?? null;

  const updatedDocuments = methodRepo.handleDocuments(
    existing.method_document,
    documentsToRemove,
    null // newFileName - when file upload is implemented
  );

  if (updatedDocuments !== undefined) {
    updateData.method_document = updatedDocuments;
  }

  // Update method via repository
  const result = await methodRepo.update(id, updateData, userId);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to update method');
  }

  return reply.send({
    success: true,
    message: 'Method updated successfully',
    data: result.getValue()
  });
};

/**
 * DELETE /api/methods/:id
 * Validation handled by middleware: idParamSchema
 */
export const deleteMethod = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const id = parseId((request.params as any).id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  // Check if method exists using repository
  const existingResult = await methodRepo.findById(id);
  if (existingResult.isFailure()) {
    throw new AppError(404, 'Method not found');
  }

  const userId = (request as any).user?.id;

  // Delete method via repository
  const result = await methodRepo.delete(id, userId);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to delete method');
  }

  return reply.send({
    success: true,
    message: 'Method deleted successfully'
  });
};

/**
 * GET /api/methods/json - JSON API for autocomplete/select2
 * Validation handled by middleware: methodJsonQuerySchema
 */
export const getMethodsJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as MethodJsonQuery;

  // Filter out ignored domains using config constant
  const search = query.q && !isIgnoredDomain(query.q) ? query.q : undefined;
  const isDataTable = query.dataTable === true;

  const result = await methodRepo.findForAutocomplete(search, isDataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to fetch methods JSON');
  }

  return reply.send(result.getValue());
};

/**
 * GET /api/methods/report - CSV export
 * Validation handled by middleware: methodReportQuerySchema
 */
export const getMethodsReport = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const query = request.query as MethodReportQuery;

  // Repository provides data
  const result = await methodRepo.findAllForReport(query.start, query.end);

  if (result.isFailure()) {
    throw new AppError(500, result.error || 'Failed to generate report');
  }

  const methods = result.getValue();

  // CSV formatting logic stays in controller (presentation layer)
  const escapeCSV = (value: string | null | undefined): string => {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = 'METHOD NAME,CODE,CATEGORY,DESCRIPTION\r\n';
  const rows = methods.map((m: { name?: string; code?: string; category_name?: string; description?: string }) =>
    `${escapeCSV(m.name)},${escapeCSV(m.code)},${escapeCSV(m.category_name)},${escapeCSV(m.description)}`
  ).join('\r\n');

  const csv = header + rows;

  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', 'attachment; filename="report-method.csv"');
  return reply.send(csv);
};

// Export generateMethodPath utility for external use (e.g., file uploads)
export { generateMethodPath };
