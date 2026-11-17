import { Controller, Get, Logger, Req, Res } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller(['metrics'])
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener métricas de la aplicación',
    description:
      'Expone las métricas de la aplicación en formato de texto compatible con Prometheus.',
    operationId: 'getMetrics',
  })
  @ApiProduces('text/plain; version=0.0.4; charset=utf-8')
  @ApiOkResponse({
    description: 'Métricas obtenidas correctamente.',
    schema: { type: 'string' },
  })
  @ApiInternalServerErrorResponse({
    description: 'Error al obtener las métricas.',
    schema: { type: 'string', example: 'Error interno del servidor' },
  })
  async getMetrics(@Req() req: Request, @Res() res: Response): Promise<any> {
    const logId: string = res.locals.logId;
    try {
      res.set('Content-type', this.metricsService.getContentType());
      res.end(await this.metricsService.getMetrics());
    } catch (error: any) {
      Logger.error(`[${logId}] Error al intentar obtener metricas`, {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).send(`Error interno del servidor`);
    }
  }
}
