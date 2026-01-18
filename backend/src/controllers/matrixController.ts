import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { MatrixRepository } from '../repositories/implementations/MatrixRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';

// Initialize repository
const matrixRepo = new MatrixRepository(prisma);

/**
 * GET /api/matrices - List dengan search & pagination
 */
export const getAllMatrices = async (request: FastifyRequest, reply: FastifyReply) => {
  const page = parseQueryParam((request.query as any).page, 1);
  const limit = Math.min(parseQueryParam((request.query as any).limit, 20), 100);
  const search = typeof (request.query as any).search === 'string' ? (request.query as any).search : undefined;

  const result = await matrixRepo.findAll({ search, page, limit });

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
 * GET /api/matrices/:id
 */
export const getMatrixById = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as any).id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  const result = await matrixRepo.findById(id);

  if (result.isFailure()) {
    throw new AppError(404, result.error!);
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/matrices
 */
export const createMatrix = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name } = request.body as any;

  // Check duplicate via repository
  const duplicateResult = await matrixRepo.findByName(name.trim());
  if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
    throw new AppError(409, 'Name already exists');
  }

  const result = await matrixRepo.create({ name: name.trim() });

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.code(201).send({
    success: true,
    message: 'Matrix created successfully',
    data: result.getValue(),
  });
};

/**
 * PUT /api/matrices/:id
 */
export const updateMatrix = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as any).id);
  const { name } = request.body as any;

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  // Check if matrix exists
  const matrixResult = await matrixRepo.findById(id);
  if (matrixResult.isFailure()) {
    throw new AppError(404, 'Matrix not found');
  }

  // No fields to update
  if (name === undefined) {
    return reply.send({
      success: true,
      message: 'No changes',
      data: matrixResult.getValue(),
    });
  }

  // Check duplicate via repository
  const duplicateResult = await matrixRepo.findByName(name.trim(), id);
  if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
    throw new AppError(409, 'Name already exists');
  }

  const result = await matrixRepo.update(id, { name: name.trim() });

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send({
    success: true,
    message: 'Matrix updated successfully',
    data: result.getValue(),
  });
};

/**
 * DELETE /api/matrices/:id
 */
export const deleteMatrix = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = parseId((request.params as any).id);

  if (!id) {
    throw new AppError(400, 'Invalid ID');
  }

  // Check if matrix exists
  const matrixResult = await matrixRepo.findById(id);
  if (matrixResult.isFailure()) {
    throw new AppError(404, 'Matrix not found');
  }

  const result = await matrixRepo.delete(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send({
    success: true,
    message: 'Matrix deleted successfully',
  });
};

/**
 * GET /api/matrices/json - JSON API for autocomplete/select2
 */
export const getMatricesJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const search = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;
  const isDataTable = (request.query as any).dataTable !== undefined;

  const result = await matrixRepo.findForAutocomplete(search, isDataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send(result.getValue());
};
