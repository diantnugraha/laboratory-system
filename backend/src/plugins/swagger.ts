import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';

export async function registerSwagger(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Laboratory System API',
        description: 'API documentation for Laboratory Management System. This API provides endpoints for managing laboratory operations including customers, contracts, orders, samples, worksheets, and invoices.',
        version: '1.0.0',
        contact: {
          name: 'Laboratory System Support'
        }
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Development Server' },
        { url: 'http://localhost:8000', description: 'Alternative Dev Server' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /api/auth/login endpoint. Format: Bearer <token>'
          }
        },
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string', example: 'Error message' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          },
          PaginatedResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'array', items: { type: 'object' } },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' }
            }
          }
        }
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints - Login, register, profile management' },
        { name: 'Users', description: 'User management - CRUD operations for system users' },
        { name: 'Customers', description: 'Customer management - CRUD operations for laboratory customers' },
        { name: 'Contracts', description: 'Contract management - Customer contracts and pricing agreements' },
        { name: 'Orders', description: 'Order management - Laboratory test orders' },
        { name: 'Samples', description: 'Sample handling - Sample registration and tracking' },
        { name: 'Worksheets', description: 'Worksheet workflow - Test execution and result recording' },
        { name: 'Invoices', description: 'Invoice management - Billing and payment tracking' },
        { name: 'Labs', description: 'Laboratory management - Lab configuration and settings' },
        { name: 'Services', description: 'Lab services - Available testing services' },
        { name: 'Packages', description: 'Service packages - Bundled service offerings' },
        { name: 'Methods', description: 'Test methods - Testing methodologies and procedures' },
        { name: 'Parameters', description: 'Test parameters - Measurable parameters in tests' },
        { name: 'Units', description: 'Measurement units - Units of measurement' },
        { name: 'Matrices', description: 'Sample matrices - Sample types and classifications' },
        { name: 'Categories', description: 'Parameter categories - Grouping of parameters' },
        { name: 'Standards', description: 'Testing standards - Quality and regulatory standards' },
        { name: 'Analyst Types', description: 'Analyst type management - Analyst classifications' },
        { name: 'Subcontractors', description: 'Subcontractor management - External testing partners' },
        { name: 'Roles', description: 'Role management - User roles and permissions' },
        { name: 'Public', description: 'Public endpoints - Health checks and public information' }
      ]
    }
  });

  await fastify.register(fastifySwaggerUI, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
}

export default registerSwagger;
