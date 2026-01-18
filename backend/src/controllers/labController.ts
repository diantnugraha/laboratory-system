import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { LabRepository } from '../repositories/implementations/LabRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';

// Initialize repository
const labRepo = new LabRepository(prisma);

/**
 * GET /api/labs - List dengan search & pagination
 */
export const getAllLabs = async (request: FastifyRequest, reply: FastifyReply) => {
  const page = parseQueryParam((request.query as any).page, 1);
  const limit = Math.min(parseQueryParam((request.query as any).limit, 20), 100);
  const search = typeof (request.query as any).search === 'string' ? (request.query as any).search : undefined;

  const result = await labRepo.findAll({ search, page, limit });

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
 * GET /api/labs/:id
 */
export const getLabById = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as any).id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  const result = await labRepo.findById(id);

  if (result.isFailure()) {
    throw new AppError(404, result.error!);
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/labs
 */
export const createLab = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name } = request.body as any;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new AppError(400, 'Name is required');
  }

  // Check duplicate via repository
  const duplicateResult = await labRepo.findByName(name.trim());
  if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
    throw new AppError(409, 'Name already exists');
  }

  const result = await labRepo.create({ name: name.trim() });

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.code(201).send({
    success: true,
    message: 'Lab created successfully',
    data: result.getValue(),
  });
};

/**
 * PUT /api/labs/:id
 */
export const updateLab = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as any).id);
  const { name } = request.body as any;

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new AppError(400, 'Name is required');
  }

  // Check if lab exists
  const labResult = await labRepo.findById(id);
  if (labResult.isFailure()) {
    throw new AppError(404, 'Lab not found');
  }

  // Check duplicate via repository
  const duplicateResult = await labRepo.findByName(name.trim(), id);
  if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
    throw new AppError(409, 'Name already exists');
  }

  const result = await labRepo.update(id, { name: name.trim() });

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send({
    success: true,
    message: 'Lab updated successfully',
    data: result.getValue(),
  });
};

/**
 * DELETE /api/labs/:id
 */
export const deleteLab = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as any).id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  // Check dependencies before delete
  const dependencyResult = await labRepo.checkDependencies(id);

  if (dependencyResult.isFailure()) {
    throw new AppError(404, dependencyResult.error!);
  }

  const deps = dependencyResult.getValue();

  if (deps.parameterCount > 0) {
    throw new AppError(409, `Cannot delete: ${deps.parameterCount} parameter(s) are linked to this lab`);
  }

  if (deps.unitCount > 0) {
    throw new AppError(409, `Cannot delete: ${deps.unitCount} unit(s) are linked to this lab`);
  }

  const result = await labRepo.delete(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send({
    success: true,
    message: 'Lab deleted successfully',
  });
};

/**
 * GET /api/labs/json - JSON API for autocomplete/select2
 */
export const getLabsJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const search = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;
  const isDataTable = (request.query as any).dataTable !== undefined;

  const result = await labRepo.findForAutocomplete(search, isDataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send(result.getValue());
};
