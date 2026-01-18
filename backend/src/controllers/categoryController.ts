import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { CategoryRepository } from '../repositories/implementations/CategoryRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiResponse } from '../types/index.js';

// Initialize repository
const categoryRepo = new CategoryRepository(prisma);

/**
 * GET /api/categories - List dengan search & pagination
 */
export const getAllCategories = async (request: FastifyRequest, reply: FastifyReply) => {
  const { page, limit, search } = request.query as {
    page?: string;
    limit?: string;
    search?: string;
  };

  const result = await categoryRepo.findAll({
    search,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
  });

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
 * GET /api/categories/:id
 */
export const getCategoryById = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = (request.params as any).id as unknown as number;

  const result = await categoryRepo.findById(id);

  if (result.isFailure()) {
    throw new AppError(404, result.error!);
  }

  return reply.send({ success: true, data: result.getValue() });
};

/**
 * POST /api/categories
 */
export const createCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name } = request.body as any;

  // Check duplicate via repository
  const duplicateResult = await categoryRepo.findByName(name.trim());
  if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
    throw new AppError(409, 'Name already exists');
  }

  // Create category
  const result = await categoryRepo.create({ name: name.trim() });

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.code(201).send({
    success: true,
    message: 'Category created successfully',
    data: result.getValue()
  });
};

/**
 * PUT /api/categories/:id
 */
export const updateCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = (request.params as any).id as unknown as number;
  const { name } = request.body as any;

  // Check if category exists using repository
  const categoryResult = await categoryRepo.findById(id);
  if (categoryResult.isFailure()) {
    throw new AppError(404, 'Category not found');
  }

  // Check duplicate via repository
  const duplicateResult = await categoryRepo.findByName(name.trim(), id);
  if (duplicateResult.isSuccess() && duplicateResult.getValue() !== null) {
    throw new AppError(409, 'Name already exists');
  }

  // Update category
  const result = await categoryRepo.update(id, { name: name.trim() });

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send({
    success: true,
    message: 'Category updated successfully',
    data: result.getValue()
  });
};

/**
 * GET /api/categories/json - JSON endpoint for autocomplete
 */
export const getCategoriesJson = async (request: FastifyRequest, reply: FastifyReply) => {
  const search = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;
  const dataTable = (request.query as any).dataTable === 'true';

  const result = await categoryRepo.findForAutocomplete(search, dataTable);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send(result.getValue());
};

/**
 * DELETE /api/categories/:id
 */
export const deleteCategory = async (request: FastifyRequest, reply: FastifyReply) => {
  const id = (request.params as any).id as unknown as number;

  // Check if category exists using repository
  const categoryResult = await categoryRepo.findById(id);
  if (categoryResult.isFailure()) {
    throw new AppError(404, 'Category not found');
  }

  // Delete category
  const result = await categoryRepo.delete(id);

  if (result.isFailure()) {
    throw new AppError(500, result.error!);
  }

  return reply.send({
    success: true,
    message: 'Category deleted successfully'
  });
};
