import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import {
  AppError,
  ValidationError,
} from '../errors/AppError.js';
import {
  HTTP_ERRORS,
  DATABASE_ERRORS,
  VALIDATION_ERRORS,
} from '../constants/errorMessages.js';

// Re-export error classes for backward compatibility
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError,
  DatabaseError,
  FileError,
  ErrorCode,
} from '../errors/AppError.js';

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  error?: string; // Only in development
}

/**
 * Map Prisma error codes to user-friendly messages and status codes
 */
const mapPrismaError = (error: Prisma.PrismaClientKnownRequestError): { status: number; message: string } => {
  const target = error.meta?.target as string[] | undefined;
  const field = target?.[0] || 'data';

  switch (error.code) {
    case 'P2002':
      return { status: 409, message: `${DATABASE_ERRORS.P2002}: ${field} is already in use` };
    case 'P2003':
      return { status: 400, message: DATABASE_ERRORS.P2003 };
    case 'P2014':
      return { status: 400, message: DATABASE_ERRORS.P2014 };
    case 'P2025':
      return { status: 404, message: DATABASE_ERRORS.P2025 };
    default:
      return { status: 500, message: HTTP_ERRORS[500] };
  }
};

/**
 * Error handler plugin for Fastify
 * Provides centralized error handling with consistent response format
 */
async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    // Always log for debugging/tracking
    console.error('Error occurred:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    const response: ErrorResponse = {
      success: false,
      message: HTTP_ERRORS[500],
    };

    // Handle ValidationError (with field errors)
    if (error instanceof ValidationError) {
      response.message = error.message;
      response.code = error.code;
      if (error.errors) {
        response.errors = error.errors;
      }
      return reply.code(error.statusCode).send(response);
    }

    // Handle other AppError subclasses
    if (error instanceof AppError) {
      response.message = error.message;
      response.code = error.code;
      return reply.code(error.statusCode).send(response);
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      response.message = VALIDATION_ERRORS.VALIDATION_FAILED;
      response.errors = error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return reply.code(400).send(response);
    }

    // Handle parsing/validation errors from type guards
    if (error.message?.includes('is required') || error.message?.includes('must be a valid')) {
      response.message = error.message;
      return reply.code(400).send(response);
    }

    // Handle Prisma known request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, message } = mapPrismaError(error);
      response.message = message;
      return reply.code(status).send(response);
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      response.message = VALIDATION_ERRORS.VALIDATION_FAILED;
      return reply.code(400).send(response);
    }

    // Handle Prisma initialization errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      response.message = DATABASE_ERRORS.CONNECTION_FAILED;
      return reply.code(500).send(response);
    }

    // Handle Fastify validation errors
    if ('validation' in error && error.validation) {
      response.message = VALIDATION_ERRORS.VALIDATION_FAILED;
      response.errors = (error.validation as unknown as Array<{ field?: string; message?: string }>).map(v => ({
        field: v.field || 'unknown',
        message: v.message || 'Validation error',
      }));
      return reply.code(400).send(response);
    }

    // Generic server error
    const statusCode = 'statusCode' in error ? (error as FastifyError).statusCode || 500 : 500;

    // Only show detailed error in development
    if (process.env.NODE_ENV === 'development') {
      response.error = error.message;
    }

    response.message = HTTP_ERRORS[statusCode] || HTTP_ERRORS[500];

    return reply.code(statusCode).send(response);
  });

  // 404 Not Found handler
  fastify.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(404).send({
      success: false,
      message: 'Route not found',
    });
  });
}

export default fp(errorHandlerPlugin, {
  name: 'errorHandler',
});
