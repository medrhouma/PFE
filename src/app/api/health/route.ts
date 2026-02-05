/**
 * Health Check API
 * GET /api/health
 * Returns system health status
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'critical';
      heapUsed: number;
      heapTotal: number;
      usagePercent: number;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: { status: 'ok' },
      memory: { 
        status: 'ok',
        heapUsed: 0,
        heapTotal: 0,
        usagePercent: 0
      }
    }
  };

  // Check database connection
  try {
    const dbPool = pool();
    if (!dbPool) {
      health.checks.database.status = 'error';
      health.checks.database.error = 'Database not configured';
      health.status = 'unhealthy';
    } else {
      const dbStart = Date.now();
      const connection = await dbPool.getConnection();
      await connection.ping();
      connection.release();
      health.checks.database.latency = Date.now() - dbStart;
    }
  } catch (error: any) {
    health.checks.database.status = 'error';
    health.checks.database.error = error.message;
    health.status = 'unhealthy';
  }

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    health.checks.memory = {
      status: usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'warning' : 'ok',
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      usagePercent
    };

    if (usagePercent > 90) {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  } catch (error) {
    health.checks.memory.status = 'warning';
  }

  // Determine overall status
  if (health.checks.database.status === 'error') {
    health.status = 'unhealthy';
  } else if (health.checks.memory.status === 'critical') {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
