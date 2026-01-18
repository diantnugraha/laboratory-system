// Re-export from plugins for backward compatibility
export { AppError } from '../plugins/errorHandler.js';

// Legacy asyncHandler - Fastify handles async natively, kept for compatibility
export const asyncHandler = <T extends (...args: any[]) => Promise<any>>(fn: T) => fn;
