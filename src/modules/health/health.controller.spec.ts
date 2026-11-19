import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import type { HealthIndicatorFunction } from '@nestjs/terminus';
import type { Request } from 'express';
import type { AppConfig } from '@/app.config';
import { HealthController } from './health.controller';

jest.mock('@/app.config', () => ({ AppConfig: class {} }));
jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => jest.fn(),
  ApiOperation: () => jest.fn(),
}));
jest.mock('@nestjs/terminus', () => ({
  HealthCheck: () => jest.fn(),
  HealthCheckService: class {},
  HttpHealthIndicator: class {},
}));

describe('HealthController', () => {
  const check = jest.fn();
  const pingCheck = jest.fn();
  const config = { logMode: 'log4js', lokiURL: 'http://loki:3100' };
  let controller: HealthController;

  beforeEach(() => {
    jest.resetAllMocks();
    config.logMode = 'log4js';
    controller = new HealthController(
      config as AppConfig,
      { check } as unknown as HealthCheckService,
      { pingCheck } as unknown as HttpHealthIndicator,
    );
  });

  it('live omite dependencias y desactiva el registro del cuerpo', async () => {
    const req = { logData: true } as Request;
    const result = { status: 'ok' };
    check.mockResolvedValue(result);
    await expect(controller.live(req)).resolves.toBe(result);
    expect(check).toHaveBeenCalledWith([]);
    expect(req.logData).toBe(false);
    expect(pingCheck).not.toHaveBeenCalled();
  });

  it('ready en log4js no consulta servicios externos', async () => {
    const req = { logData: true } as Request;
    check.mockResolvedValue({ status: 'ok' });
    await expect(controller.ready(req)).resolves.toEqual({ status: 'ok' });
    expect(check).toHaveBeenCalledWith([]);
    expect(req.logData).toBe(false);
    expect(pingCheck).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'ready ejecuta el indicador Loki y propaga su resultado/error (%s)',
    async (fails) => {
      config.logMode = 'loki';
      const error = new Error('Loki unavailable');
      const result = { loki: { status: 'up' } };
      if (fails) pingCheck.mockRejectedValue(error);
      else pingCheck.mockResolvedValue(result);
      check.mockImplementation((indicators: HealthIndicatorFunction[]) => {
        const indicator = indicators[0];
        if (typeof indicator !== 'function')
          throw new Error('Expected a health indicator callback');
        return indicator();
      });
      const req = { logData: true } as Request;
      const response: unknown = controller.ready(req);
      if (fails) await expect(response).rejects.toBe(error);
      else await expect(response).resolves.toBe(result);
      expect(pingCheck).toHaveBeenCalledWith('loki', 'http://loki:3100/ready', {
        timeout: 3000,
      });
      expect(req.logData).toBe(false);
    },
  );
});
