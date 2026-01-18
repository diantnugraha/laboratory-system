import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { RoleRepository } from '../repositories/implementations/RoleRepository.js';
import { sanitizeSearchQuery } from '../utils/searchHelper.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';

// Initialize repository
const roleRepo = new RoleRepository(prisma);

// Get list of roles (requires authentication)
// User data is retrieved from database via authenticate middleware
export const getRoles = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    // User is already authenticated and attached to request.user by authenticate middleware

    // Optional: limit & offset from query params (max limit 1000)
    const query = request.query as any;
    const limit = Math.min(parseQueryParam(query.limit, 100), 1000);
    const offset = parseQueryParam(query.offset, 0);
    const searchQuery = sanitizeSearchQuery(query.q as string | undefined);

    // Call repository
    const result = await roleRepo.findAll({ search: searchQuery, limit, offset });

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const data = result.getValue();

    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination,
    };

    return reply.send({
      ...response,
      source: 'simlab_dev.roles',
      requestedBy: {
        id: request.user?.id,
        username: request.user?.username,
        role_id: request.user?.role_id,
        role_name: request.user?.role?.name,
      },
    });
  } catch (error) {
    console.error('Get roles error:', error);
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch roles from simlab_dev',
    });
  }
};

// Get role detail by ID (requires authentication)
export const getRoleById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const params = request.params as any;
    const roleId = parseId(params.id);
    if (!roleId) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid role ID',
      });
    }

    // Call repository
    const result = await roleRepo.findById(roleId);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      source: 'simlab_dev.roles',
      requestedBy: {
        id: request.user?.id,
        username: request.user?.username,
        role_id: request.user?.role_id,
        role_name: request.user?.role?.name,
      },
      data: result.getValue(),
    });
  } catch (error) {
    console.error('Get role by ID error:', error);
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch role from simlab_dev',
    });
  }
};
