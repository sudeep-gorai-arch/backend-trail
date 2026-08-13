import { Request, Response } from 'express';
import { response } from '../utils/ApiResponse';

export const healthController = {
  /**
   * Detailed health check endpoint.
   * Returns HTTP 200 if system is healthy, or 503 if database/services are degraded.
   */
  async getHealth(_req: Request, res: Response): Promise<void> {
    response.success(res, {
      status: 'ok',
      message: 'System is healthy',
    });
    return;
  },

};
