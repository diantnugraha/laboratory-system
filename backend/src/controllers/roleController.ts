import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, sanitizeSearchQuery } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Get list of roles (requires authentication)
// User data is retrieved from database via authenticate middleware
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is already authenticated and attached to req.user by authenticate middleware
    
    // Optional: limit & offset from query params
    const limit = Math.min(parseQueryParam(req.query.limit, 100), 1000);
    const offset = parseQueryParam(req.query.offset, 0);
    const searchQuery = sanitizeSearchQuery(req.query.q as string | undefined);

    const whereCondition = {
      ...buildSearchCondition('name', searchQuery),
    };

    const [roles, total] = await Promise.all([
      prisma.roles.findMany({
        where: whereCondition,
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          id: 'asc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.roles.count({
        where: whereCondition,
      }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: roles,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
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

    const role = await prisma.roles.findFirst({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!role) {
      res.status(404).json({
        success: false,
        message: 'Role not found',
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
      data: role,
    });
  } catch (error) {
    console.error('Get role by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role from simlab_dev',
    });
  }
};

