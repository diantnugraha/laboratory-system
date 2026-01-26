import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  login,
  register,
  getProfile,
  logout,
  generatePassword,
  changePassword,
  forgotPassword,
  validateSetupToken,
  setupPassword,
  validateResetToken,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../plugins/auth.js';
import { validate } from '../plugins/zodValidator.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema
} from '../validators/index.js';
import { zodToSwagger } from '../schemas/swagger/index.js';

// ============================================
// Zod Schemas for Auth-specific validations
// ============================================

const generatePasswordSchema = z.object({
  user_id: z.number({ message: 'User ID is required' })
});

const changePasswordBodySchema = z.object({
  old_password: z.string()
    .min(1, 'Current password is required'),
  new_password: z.string()
    .min(6, 'New password must be at least 6 characters')
});

const setupPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Token is required')
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string()
    .min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
});

const resetPasswordBodySchema = z.object({
  token: z.string()
    .min(1, 'Token is required')
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string()
    .min(1, 'Confirm password is required')
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
});

const validateTokenQuerySchema = z.object({
  token: z.string().min(1, 'Token is required')
});

// ============================================
// Routes
// ============================================

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Public routes
  fastify.post('/register', {
    schema: {
      description: 'Register a new user account',
      tags: ['Auth'],
      body: zodToSwagger(registerSchema),
      response: {
        201: {
          description: 'User registered successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Registration successful' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                email: { type: 'string' },
                username: { type: 'string' },
                display_name: { type: 'string' }
              }
            }
          }
        }
      }
    },
    preHandler: [validate(registerSchema)]
  }, register);

  fastify.post('/login', {
    schema: {
      description: 'Authenticate user and get JWT token',
      tags: ['Auth'],
      body: zodToSwagger(loginSchema),
      response: {
        200: {
          description: 'Login successful',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'JWT access token' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string' },
                    username: { type: 'string' },
                    display_name: { type: 'string' },
                    role_id: { type: 'number' },
                    role_name: { type: 'string', nullable: true },
                    customer_id: { type: 'number', nullable: true },
                    contact_id: { type: 'number', nullable: true },
                    profile_picture: { type: 'string', nullable: true },
                    department: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [validate(loginSchema)]
  }, login);

  fastify.post('/forgot-password', {
    schema: {
      description: 'Request password reset email',
      tags: ['Auth'],
      body: zodToSwagger(forgotPasswordSchema),
      response: {
        200: {
          description: 'Reset email sent',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Password reset email has been sent' }
          }
        }
      }
    },
    preHandler: [validate(forgotPasswordSchema)]
  }, forgotPassword);

  fastify.get('/validate-setup-token', {
    schema: {
      description: 'Validate setup password token',
      tags: ['Auth'],
      querystring: zodToSwagger(validateTokenQuerySchema),
      response: {
        200: {
          description: 'Token is valid',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                email: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, validateSetupToken);

  fastify.post('/setup-password', {
    schema: {
      description: 'Set initial password for new user',
      tags: ['Auth'],
      body: zodToSwagger(setupPasswordSchema),
      response: {
        200: {
          description: 'Password set successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Password set successfully' }
          }
        }
      }
    },
    preHandler: [validate(setupPasswordSchema)]
  }, setupPassword);

  fastify.get('/validate-reset-token', {
    schema: {
      description: 'Validate password reset token',
      tags: ['Auth'],
      querystring: zodToSwagger(validateTokenQuerySchema),
      response: {
        200: {
          description: 'Token is valid',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                valid: { type: 'boolean' },
                email: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, validateResetToken);

  fastify.post('/reset-password', {
    schema: {
      description: 'Reset password using token from email',
      tags: ['Auth'],
      body: zodToSwagger(resetPasswordBodySchema),
      response: {
        200: {
          description: 'Password reset successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Password reset successfully' }
          }
        }
      }
    },
    preHandler: [validate(resetPasswordBodySchema)]
  }, resetPassword);

  // Protected routes
  fastify.get('/profile', {
    schema: {
      description: 'Get current user profile',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'User profile data',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    email: { type: 'string' },
                    username: { type: 'string' },
                    display_name: { type: 'string' },
                    role_id: { type: 'number' },
                    role_name: { type: 'string', nullable: true },
                    customer_id: { type: 'number', nullable: true },
                    contact_id: { type: 'number', nullable: true },
                    profile_picture: { type: 'string', nullable: true },
                    department: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [authenticate]
  }, getProfile);

  fastify.post('/logout', {
    schema: {
      description: 'Logout current user',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Logout successful',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Logout successful' }
          }
        }
      }
    },
    preHandler: [authenticate]
  }, logout);

  fastify.post('/generate-password', {
    schema: {
      description: 'Generate and send setup password email to user. Requires authentication.',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(generatePasswordSchema),
      response: {
        200: {
          description: 'Password setup email sent',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Password setup email has been sent' }
          }
        }
      }
    },
    preHandler: [authenticate, validate(generatePasswordSchema)]
  }, generatePassword);

  fastify.post('/change-password', {
    schema: {
      description: 'Change password for authenticated user',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(changePasswordBodySchema),
      response: {
        200: {
          description: 'Password changed successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Password changed successfully' }
          }
        }
      }
    },
    preHandler: [authenticate, validate(changePasswordBodySchema)]
  }, changePassword);
};

export default authRoutes;
