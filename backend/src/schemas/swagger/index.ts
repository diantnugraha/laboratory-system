import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';

/**
 * Convert Zod schema to OpenAPI 3.0 JSON Schema
 */
export function zodToSwagger<T extends ZodType>(schema: T) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' });
  // Remove $schema property as it's not needed for OpenAPI
  if ('$schema' in jsonSchema) {
    delete (jsonSchema as Record<string, unknown>)['$schema'];
  }
  return jsonSchema;
}

/**
 * Error response schema - inline version for Fastify serialization
 */
export const errorResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const, example: false },
    message: { type: 'string' as const },
    errors: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          field: { type: 'string' as const },
          message: { type: 'string' as const }
        }
      }
    }
  }
};

/**
 * Standard error responses for Swagger routes
 * Use these instead of $ref to avoid Fastify serialization issues
 */
export const errorResponses = {
  400: { description: 'Validation error', ...errorResponseSchema },
  401: { description: 'Unauthorized - Invalid or missing token', ...errorResponseSchema },
  403: { description: 'Forbidden - Insufficient permissions', ...errorResponseSchema },
  404: { description: 'Resource not found', ...errorResponseSchema },
  409: { description: 'Conflict - Resource already exists', ...errorResponseSchema },
  500: { description: 'Internal server error', ...errorResponseSchema }
};

/**
 * Common response schemas for Swagger documentation
 */
export const commonSchemas = {
  // Success response with data
  successResponse: (dataSchema?: object) => ({
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string' },
      data: dataSchema || { type: 'object' }
    }
  }),

  // Error response
  errorResponse: errorResponseSchema,

  // Paginated response
  paginatedResponse: (itemSchema: object) => ({
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: itemSchema
      },
      total: { type: 'integer', example: 100 },
      limit: { type: 'integer', example: 10 },
      offset: { type: 'integer', example: 0 }
    }
  }),

  // ID parameter
  idParam: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^\\d+$', description: 'Resource ID' }
    },
    required: ['id']
  },

  // Common query parameters
  paginationQuery: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Search term' },
      limit: { type: 'string', pattern: '^\\d+$', description: 'Number of items to return', default: '10' },
      offset: { type: 'string', pattern: '^\\d+$', description: 'Number of items to skip', default: '0' }
    }
  }
};

/**
 * Role IDs reference for documentation
 */
export const ROLE_IDS = {
  SUPERADMIN: 1,
  ADMIN: 2,
  SALES: 3,
  ANALYST: 5,
  QC: 6,
  TECHNICAL_MANAGER: 7,
  CUSTOMER: 8,
  SUPERVISOR: 9,
  SUBCONTRACT_STAFF: 10
} as const;

/**
 * Helper to generate role requirement description
 */
export function roleDescription(roles: number[]): string {
  const roleNames: Record<number, string> = {
    1: 'SuperAdmin',
    2: 'Admin',
    3: 'Sales',
    5: 'Analyst',
    6: 'QC',
    7: 'TechnicalManager',
    8: 'Customer',
    9: 'Supervisor',
    10: 'SubcontractStaff'
  };

  const names = roles.map(id => `${roleNames[id] || 'Unknown'} (${id})`);
  return `Requires role: ${names.join(', ')}`;
}
