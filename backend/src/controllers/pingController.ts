import { Request, Response } from 'express';
import { prisma } from '../config/database';

// Simple public ping that confirms DB connection
export const pingSimlab = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Test database connection using Prisma's type-safe query (recommended for Prisma 7.2.0)
    // Using findFirst on roles table as a lightweight connection test
    await prisma.roles.findFirst({
      select: { id: true },
      take: 1,
    });

    res.json({
      success: true,
      message: 'Connected to simlab_dev',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Public ping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ping simlab_dev',
    });
  }
};







