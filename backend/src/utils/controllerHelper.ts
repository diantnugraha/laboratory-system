import type { FastifyReply } from 'fastify';

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * Handle controller errors with consistent format
 * Logs error and sends standardized JSON response
 */
export const handleControllerError = (
  reply: FastifyReply,
  error: unknown,
  defaultMessage: string,
  logPrefix: string
): void => {
  console.error(`${logPrefix}:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  const response: ErrorResponse = {
    success: false,
    message: defaultMessage,
    ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
  };

  reply.code(500).send(response);
};

/**
 * Send failure response with specific status code
 */
export const sendFailure = (
  reply: FastifyReply,
  statusCode: number,
  message: string
): void => {
  reply.code(statusCode).send({ success: false, message });
};

/**
 * Send success response with data
 */
export const sendSuccess = <T>(
  reply: FastifyReply,
  data: T,
  statusCode: number = 200
): void => {
  reply.code(statusCode).send({ success: true, data });
};
