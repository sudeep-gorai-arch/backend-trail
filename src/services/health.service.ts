import { prisma } from '../config/prisma';
import { env } from '../config/env';

export interface DatabaseHealth {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
}

export interface SystemMetrics {
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  memoryUsage: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    externalMb: number;
  };
  nodeVersion: string;
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  system: SystemMetrics;
  database: DatabaseHealth;
}

export const healthService = {
  /**
   * Check database connectivity and measure query latency.
   */
  async checkDatabase(): Promise<DatabaseHealth> {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startTime;
      return {
        status: 'up',
        latencyMs,
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Database query failed';
      return {
        status: 'down',
        latencyMs,
        error: errorMessage,
      };
    }
  },

  /**
   * Retrieve system metrics (uptime, memory usage, environment).
   */
  getSystemMetrics(): SystemMetrics {
    const memory = process.memoryUsage();
    const bytesToMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    return {
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV || 'development',
      memoryUsage: {
        rssMb: bytesToMb(memory.rss),
        heapTotalMb: bytesToMb(memory.heapTotal),
        heapUsedMb: bytesToMb(memory.heapUsed),
        externalMb: bytesToMb(memory.external),
      },
      nodeVersion: process.version,
    };
  },

  /**
   * Generate comprehensive health check details.
   */
  async getHealthDetails(): Promise<HealthCheckResult> {
    const dbHealth = await this.checkDatabase();
    const systemMetrics = this.getSystemMetrics();

    const isHealthy = dbHealth.status === 'up';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      database: dbHealth,
    };
  },
};
