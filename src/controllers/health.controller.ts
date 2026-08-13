import { Request, Response } from 'express';
import { healthService } from '../services/health.service';
import { response } from '../utils/ApiResponse';

export const healthController = {
  /**
   * Detailed health check endpoint.
   * Returns HTTP 200 if system is healthy, or 503 if database/services are degraded.
   */
  async getHealth(_req: Request, res: Response): Promise<void> {
    const health = await healthService.getHealthDetails();

    if (health.status === 'ok') {
      response.success(res, health, {
        message: 'System is healthy',
      });
      return;
    }

    response.error(res, 'Service degraded', 503, health);
  },

  /**
   * Fast liveness probe to verify process execution.
   */
  async getLiveness(_req: Request, res: Response): Promise<void> {
    const metrics = healthService.getSystemMetrics();

    response.success(res, {
      status: 'ok',
      uptimeSeconds: metrics.uptimeSeconds,
      timestamp: metrics.timestamp,
    });
  },

  /**
   * Deep readiness probe to verify system dependency availability (e.g. database).
   */
  async getReadiness(_req: Request, res: Response): Promise<void> {
    const dbCheck = await healthService.checkDatabase();

    if (dbCheck.status === 'up') {
      response.success(res, {
        status: 'ready',
        database: dbCheck,
      });
      return;
    }

    response.error(res, 'Service not ready: Database unreachable', 503, {
      status: 'not_ready',
      database: dbCheck,
    });
  },
};
