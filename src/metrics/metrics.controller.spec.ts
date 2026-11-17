import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => jest.fn(),
  ApiOperation: () => jest.fn(),
  ApiProduces: () => jest.fn(),
  ApiOkResponse: () => jest.fn(),
  ApiInternalServerErrorResponse: () => jest.fn(),
}));

describe('MetricsController', () => {
  const getMetrics = jest.fn<Promise<string>, []>();
  const getContentType = jest.fn<string, []>();
  let controller: MetricsController;
  const req = {} as Request;
  const res = {
    locals: { logId: '123' },
    set: jest.fn(),
    end: jest.fn(),
    status: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    res.status.mockReturnValue(res);
    getContentType.mockReturnValue('text/plain');
    controller = new MetricsController({
      getMetrics,
      getContentType,
    } as unknown as MetricsService);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('envía las métricas con el tipo de contenido del servicio', async () => {
    getMetrics.mockResolvedValue('requests_total 3');
    await controller.getMetrics(req, res as unknown as Response);
    expect(getMetrics).toHaveBeenCalledTimes(1);
    expect(res.set).toHaveBeenCalledWith('Content-type', 'text/plain');
    expect(res.end).toHaveBeenCalledWith('requests_total 3');
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each(['contentType', 'metrics'])(
    'responde 500 si falla %s',
    async (stage) => {
      const error = new Error('registry failed');
      if (stage === 'contentType')
        getContentType.mockImplementation(() => {
          throw error;
        });
      else getMetrics.mockRejectedValue(error);
      await controller.getMetrics(req, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error interno del servidor');
      expect(res.end).not.toHaveBeenCalled();
      expect(jest.mocked(Logger).error).toHaveBeenCalledWith(
        '[123] Error al intentar obtener metricas',
        { error: error.message, stack: error.stack },
      );
    },
  );
});
