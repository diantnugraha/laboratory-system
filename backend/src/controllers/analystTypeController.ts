import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { AnalystTypeRepository } from '../repositories/implementations/AnalystTypeRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiResponse } from '../types/index.js';

// Initialize repository
const analystTypeRepo = new AnalystTypeRepository(prisma);

/**
 * GET /api/analyst-types - List dengan search & pagination
 */
export const getAllAnalystTypes = async (request: FastifyRequest, reply: FastifyReply) => {
  const { page = 1, limit = 20, search } = request.query as {
    page?: number;
    limit?: number;
    search?: string;
  };

  const result = await analystTypeRepo.findAll({ search, page, limit });

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
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
 * GET /api/analyst-types/:id
 */
export const getAnalystTypeById = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = (request.params as { id: number }).id;

  const result = await analystTypeRepo.findById(id);

  if (result.isFailure()) {
    throw new AppError(404, result.error!);
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/analyst-types
 */
export const createAnalystType = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, list_service } = request.body as { name: string; list_service?: string };

  // Check duplicate via repository
  const duplicateResult = await analystTypeRepo.findByName(name.trim());
  if (duplicateResult.isSuccess() && duplicateResult.getValue()) {
    throw new AppError(409, 'Name already exists');
  }

  // Create analyst type via repository
  const result = await analystTypeRepo.create({
    name: name.trim(),
    list_service: typeof list_service === 'string' ? list_service.trim() || null : null,
    created_by: request.user?.id || 1,
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.code(201).send({
    success: true,
    message: 'Analyst type created successfully',
    data: result.getValue(),
  });
};

/**
 * PUT /api/analyst-types/:id
 */
export const updateAnalystType = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = (request.params as { id: number }).id;
  const { name, list_service } = request.body as { name?: string; list_service?: string };

  // Check exists via repository
  const existingResult = await analystTypeRepo.findById(id);
  if (existingResult.isFailure()) {
    throw new AppError(404, 'Analyst type not found');
  }

  const updateData: { name?: string; list_service?: string | null; updated_by?: number | null } = {};

  if (name !== undefined) {
    updateData.name = name.trim();
  }

  if (list_service !== undefined) {
    updateData.list_service = typeof list_service === 'string' ? list_service.trim() || null : null;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'No valid data to update');
  }

  // Check duplicate via repository
  if (updateData.name) {
    const duplicateResult = await analystTypeRepo.findByName(updateData.name, id);
    if (duplicateResult.isSuccess() && duplicateResult.getValue()) {
      throw new AppError(409, 'Name already exists');
    }
  }

  // Update via repository
  updateData.updated_by = request.user?.id || null;
  const result = await analystTypeRepo.update(id, updateData);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send({
    success: true,
    message: 'Analyst type updated successfully',
    data: result.getValue(),
  });
};

/**
 * DELETE /api/analyst-types/:id
 */
export const deleteAnalystType = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = (request.params as { id: number }).id;

  // Check dependencies via repository
  const dependencyResult = await analystTypeRepo.checkDependencies(id);

  if (dependencyResult.isFailure()) {
    throw new AppError(404, dependencyResult.error!);
  }

  const dependencies = dependencyResult.getValue();

  // Check for dependencies before deletion
  if (dependencies.analystCount > 0) {
    throw new AppError(409, `Cannot delete: ${dependencies.analystCount} analyst(s) are assigned to this type`);
  }

  if (dependencies.serviceCount > 0) {
    throw new AppError(409, `Cannot delete: ${dependencies.serviceCount} service(s) are linked to this type`);
  }

  // Delete via repository
  const result = await analystTypeRepo.delete(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send({
    success: true,
    message: 'Analyst type deleted successfully',
  });
};

/**
 * GET /api/analyst-types/json - JSON API for dropdowns/autocomplete
 */
export const getAnalystTypesJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const query = request.query as { q?: string; dataTable?: string };
  const searchTerm = typeof query.q === 'string' ? query.q : undefined;
  const isDataTable = query.dataTable !== undefined;

  const result = await analystTypeRepo.findForAutocomplete(searchTerm, isDataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send(result.getValue());
};

/**
 * GET /api/analyst-types/reverse - Migration utility to populate Service.analyst_type_id from AnalystType.list_service
 * WARNING: This is a one-time migration tool. Use with caution.
 */
export const reverseAnalystTypes = async (_request: FastifyRequest, reply: FastifyReply) => {
  const result = await analystTypeRepo.performReverseMigration();

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  const { results, totalProcessed } = result.getValue();

  // Return HTML response as per specification
  reply.header('Content-Type', 'text/html');
  return reply.send(
    `start reverse<br>${results.join('<br>')}<br>total : ${totalProcessed}`
  );
};
