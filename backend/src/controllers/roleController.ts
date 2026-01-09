import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { RoleRepository } from '../repositories/implementations/RoleRepository';
import { sanitizeSearchQuery } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const roleRepo = new RoleRepository(prisma);

// Get list of roles (requires authentication)
// User data is retrieved from database via authenticate middleware
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is already authenticated and attached to req.user by authenticate middleware

    // Optional: limit & offset from query params (max limit 1000)
    const limit = Math.min(parseQueryParam(req.query.limit, 100), 1000);
    const offset = parseQueryParam(req.query.offset, 0);
    const searchQuery = sanitizeSearchQuery(req.query.q as string | undefined);

    // Call repository
    const result = await roleRepo.findAll({ search: searchQuery, limit, offset });

    // Handle repository result
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error,
      });
      return;
    }

    const data = result.getValue();

    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination,
    };

    res.json({
      ...response,
      source: 'simlab_dev.roles',
      requestedBy: {
        id: req.user?.id,
        username: req.user?.username,
        role_id: req.user?.role_id,
        role_name: req.user?.role?.name,
      },
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles from simlab_dev',
    });
  }
};

// Get role detail by ID (requires authentication)
export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const roleId = parseId(req.params.id);
    if (!roleId) {
      res.status(400).json({
        success: false,
        message: 'Invalid role ID',
      });
      return;
    }

    // Call repository
    const result = await roleRepo.findById(roleId);

    // Handle repository result
    if (result.isFailure()) {
      res.status(404).json({
        success: false,
        message: result.error,
      });
      return;
    }

    res.json({
      success: true,
      source: 'simlab_dev.roles',
      requestedBy: {
        id: req.user?.id,
        username: req.user?.username,
        role_id: req.user?.role_id,
        role_name: req.user?.role?.name,
      },
      data: result.getValue(),
    });
  } catch (error) {
    console.error('Get role by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role from simlab_dev',
    });
  }
};
