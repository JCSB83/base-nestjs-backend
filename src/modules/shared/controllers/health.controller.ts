import { Controller, Get, Req } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorFunction, HttpHealthIndicator } from '@nestjs/terminus';
import { AppConfig } from 'src/app.config';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private readonly appConfig: AppConfig,
        private readonly health: HealthCheckService,
        private readonly http: HttpHealthIndicator
    ) {}

    @Get('live')
    @ApiOperation({
        summary: 'Comprobar que la aplicación está en ejecución',
        description: 'Comprueba que la aplicación puede atender solicitudes sin consultar dependencias externas.',
        operationId: 'healthLive',
    })
    @HealthCheck()
    live(@Req() req: Request) {
        req.logData = false;
        return this.health.check([]);
    }

    @Get('ready')
    @ApiOperation({
        summary: 'Comprobar la disponibilidad de la aplicación',
        description: 'En modo log4js no consulta dependencias externas. En modo loki comprueba LOKI_URL/ready con un timeout de 3000 ms y devuelve 503 si la comprobación falla.',
        operationId: 'healthReady',
    })
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
