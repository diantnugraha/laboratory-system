import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validate a single target (body, query, or params) using a Zod schema
 */
export const validate = (schema: z.ZodType, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: result.error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
      return;
    }

    // For body, we can assign directly. For query/params, use Object.assign
    // because they are getter-only properties in Express
    if (target === 'body') {
      req.body = result.data;
    } else {
      Object.assign(req[target], result.data);
    }
    next();
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
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field: string; message: string }> = [];

    for (const [target, schema] of Object.entries(schemas)) {
      if (schema) {
        const result = schema.safeParse(req[target as ValidationTarget]);

        if (!result.success) {
          errors.push(...result.error.issues.map((e: z.ZodIssue) => ({
            field: e.path.length > 0 ? `${target}.${e.path.join('.')}` : target,
            message: e.message
          })));
        } else {
          // For body, we can assign directly. For query/params, use Object.assign
          if (target === 'body') {
            req.body = result.data;
          } else {
            Object.assign(req[target as ValidationTarget], result.data);
          }
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors
      });
      return;
    }

    next();
  };
};
