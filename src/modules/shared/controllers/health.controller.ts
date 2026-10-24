import { Controller, Get, Req } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorFunction, HttpHealthIndicator } from '@nestjs/terminus';
import { AppConfig } from 'src/app.config';
import type { Request } from 'express';

@Controller('health')
export class HealthController {
    constructor(
        private readonly appConfig: AppConfig,
        private readonly health: HealthCheckService,
        private readonly http: HttpHealthIndicator
    ) {}

    @Get('live')
    @HealthCheck()
    live(@Req() req: Request) {
        req.logData = false;
        return this.health.check([]);
    }

    @Get('ready')
    @HealthCheck()
    ready(@Req() req: Request) {
        req.logData = false;
        const indicators: HealthIndicatorFunction[] = [];
        if (this.appConfig.logMode === 'loki') {
            indicators.push(() => this.http.pingCheck('loki', this.appConfig.lokiURL + '/ready', { timeout: 3000 }));
        }
        return this.health.check(indicators);
    }
}
