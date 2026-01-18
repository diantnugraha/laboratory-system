import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validate a single target (body, query, or params) using a Zod schema
 * Returns a Fastify preHandler hook
 */
export const validate = (schema: z.ZodType, target: ValidationTarget = 'body'): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const dataToValidate = target === 'body'
      ? request.body
      : target === 'query'
        ? request.query
        : request.params;

    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        message: 'Validation failed',
        errors: result.error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    // Assign validated data back to request
    if (target === 'body') {
      (request as any).body = result.data;
    } else if (target === 'query') {
      (request as any).query = result.data;
    } else {
      (request as any).params = result.data;
    }
  };
};

/**
 * Validate multiple targets (body, query, params) using Zod schemas
 * Collects all errors before returning response
 */
export const validateRequest = (schemas: {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const errors: Array<{ field: string; message: string }> = [];
    const targets: ValidationTarget[] = ['body', 'query', 'params'];

    for (const target of targets) {
      const schema = schemas[target];
      if (schema) {
        const dataToValidate = target === 'body'
          ? request.body
          : target === 'query'
            ? request.query
            : request.params;

        const result = schema.safeParse(dataToValidate);

        if (!result.success) {
          errors.push(...result.error.issues.map((e: z.ZodIssue) => ({
            field: e.path.length > 0 ? `${target}.${e.path.join('.')}` : target,
            message: e.message
          })));
        } else {
          // Assign validated data back to request
          if (target === 'body') {
            (request as any).body = result.data;
          } else if (target === 'query') {
            (request as any).query = result.data;
          } else {
            (request as any).params = result.data;
          }
        }
      }
    }

    if (errors.length > 0) {
      return reply.code(400).send({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
  };
};
