import { Request, Response } from 'express';
import prisma from '../config/prisma';

/**
 * Readiness reflects database availability, unlike a static 200 response.
 * Do not disclose database credentials or the underlying connection error.
 */
export const healthController = {
  async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        success: true,
        data: { status: 'ok' },
        message: 'System is healthy',
      });
    } catch {
      res.status(503).json({
        success: false,
        data: { status: 'degraded' },
        message: 'Service temporarily unavailable',
      });
    }
  },
};
