import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';
import { AppConfig } from '@/app.config';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly metrics: MetricsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();
    const appName = this.appConfig.appName
      .replace(/[^a-zA-Z0-9_:]/g, '_')
      .replace(/^[^a-zA-Z_:]/, '_$&');

    let recorded = false;

    const record = (outcome: 'finished' | 'aborted') => {
      if (recorded) return;
      recorded = true;

      const duration = Number(process.hrtime.bigint() - start) / 1e9;
      const route = req.route?.path
        ? `${req.baseUrl}${req.route.path}`
        : 'unmatched';
      const labels = {
        environment: this.appConfig.environment,
        method: req.method,
        route,
        status_code: outcome === 'aborted' ? 'aborted' : String(res.statusCode),
      };

      try {
        this.metrics.incrementCounter(
          `${appName}_http_requests_total`,
          'Total HTTP requests',
          labels,
        );
        this.metrics.observeHistogram(
          `${appName}_http_request_duration_seconds`,
          'HTTP request duration in seconds',
          labels,
          duration,
        );
      } catch (error: any) {
        // Registrar el error mediante tu LoggerService,
        // evitando que falle el proceso por las métricas.
        Logger.error(`Error trying to add metrics`, {
          error: error.message,
          stack: error.stack,
        });
      }
    };

    res.once('finish', () => record('finished'));

    res.once('close', () => {
      if (!res.writableFinished) {
        record('aborted');
      }
    });

    next();
  }
}
