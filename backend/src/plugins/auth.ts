import type { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';

interface JwtPayload {
  userId: number;
  iat?: number;
  passwordChangedAt?: number;
}

/**
 * Authentication middleware for Fastify
 * Verifies JWT token and attaches user to request
 */
export const authenticate: preHandlerHookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured in environment variables');
      return reply.code(500).send({
        success: false,
        message: 'Server configuration error'
      });
    }

    // Get token from header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return reply.code(401).send({
        success: false,
        message: 'Token is empty'
      });
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return reply.code(401).send({
          success: false,
          message: 'Invalid token'
        });
      }
      if (jwtError instanceof jwt.TokenExpiredError) {
        return reply.code(401).send({
          success: false,
          message: 'Token expired'
        });
      }
      throw jwtError;
    }

    if (!decoded || !decoded.userId) {
      return reply.code(401).send({
        success: false,
        message: 'Invalid token payload'
      });
    }

    // Get user from database using Prisma (only active users, trash IS NULL)
    const user = await prisma.users.findFirst({
      where: {
        id: decoded.userId,
        trash: null
      },
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        role_id: true,
        customer_id: true,
        contact_id: true,
        profile_picture: true,
        department: true,
        updated_at: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      return reply.code(401).send({
        success: false,
        message: 'User not found or has been deleted'
      });
    }

    // Check if password was changed after token was issued
    if (decoded.iat !== undefined) {
      const userPasswordChangedAt = user.updated_at
        ? Math.floor(new Date(user.updated_at).getTime() / 1000)
        : 0;

      if (userPasswordChangedAt > 0) {
        const timeDifference = userPasswordChangedAt - decoded.iat;
        const ONE_HOUR = 3600;

        console.log('Token validation check:', {
          userId: decoded.userId,
          tokenIat: decoded.iat,
          userPasswordChangedAt: userPasswordChangedAt,
          timeDifference: timeDifference
        });

        if (decoded.iat < userPasswordChangedAt && timeDifference > ONE_HOUR) {
          console.log('Token invalidated: password changed more than 1 hour after token creation');
          return reply.code(401).send({
            success: false,
            message: 'Session expired. Please login again.'
          });
        }
      }
    }

    // Remove updated_at from user object before attaching to request
    const { updated_at, ...userWithoutUpdatedAt } = user;

    // Attach user to request
    request.user = userWithoutUpdatedAt as typeof request.user;
  } catch (error) {
    console.error('Authentication error:', error);

    const errorMessage = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message
      : 'Server error during authentication';

    return reply.code(500).send({
      success: false,
      message: errorMessage
    });
  }
};

/**
 * Authorization middleware factory
 * Returns a preHandler that checks if user has required role
 */
export const authorize = (...roleIds: number[]): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRoleId = request.user.role_id;

      if (!roleIds.includes(userRoleId)) {
        return reply.code(403).send({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};

/**
 * Customer ownership authorization middleware factory
 */
export const authorizeCustomerOwnership = (resourceCustomerIdField: string = 'customer_id'): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        return reply.code(401).send({
          success: false,
          message: 'Authentication required'
        });
      }

      // If user is not a customer, allow (admin/superadmin can access all)
      if (request.user.role_id !== 8) {
        return;
      }

      // If user is customer, check ownership
      const params = request.params as Record<string, string>;
      const body = request.body as Record<string, any>;
      const resourceId = params.id || body?.id;

      if (!resourceId) {
        return reply.code(400).send({
          success: false,
          message: 'Resource ID required'
        });
      }

      if (request.user.customer_id && body?.[resourceCustomerIdField]) {
        if (request.user.customer_id !== body[resourceCustomerIdField]) {
          return reply.code(403).send({
            success: false,
            message: 'Access denied. You can only access your own resources.'
          });
        }
      }
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};

/**
 * Auth plugin for Fastify
 */
async function authPlugin(fastify: FastifyInstance) {
  // Decorate fastify with auth methods
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('authorize', authorize);
  fastify.decorate('authorizeCustomerOwnership', authorizeCustomerOwnership);
}

export default fp(authPlugin, {
  name: 'auth'
});
