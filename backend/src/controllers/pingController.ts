import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';

// Simple public ping that confirms DB connection
export const pingSimlab = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    // Test database connection using Prisma's type-safe query (recommended for Prisma 7.2.0)
    // Using findFirst on roles table as a lightweight connection test
    await prisma.roles.findFirst({
      select: { id: true },
      take: 1,
    });

    return reply.send({
      success: true,
      message: 'Connected to simlab_dev',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Public ping error:', error);
    return reply.code(500).send({
      success: false,
      message: 'Failed to ping simlab_dev',
    });
  }
};
