jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => () => undefined,
  ApiOperation: () => () => undefined,
}));
jest.mock('@nestjs/terminus', () => ({
  HealthCheck: () => () => undefined,
  HealthCheckService: class {},
  HttpHealthIndicator: class {},
}));
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import type { Request } from 'express';
import { AppConfig } from 'src/app.config';
import { HealthController } from './health.controller';
describe('HealthController', () => {
  let check: jest.Mock;
  let pingCheck: jest.Mock;
  let controller: HealthController;
  let req: Request;
  let config: { logMode: string; lokiURL: string };
  const result = { status: 'ok', info: {}, error: {}, details: {} };
  beforeEach(() => {
    check = jest.fn().mockResolvedValue(result);
    pingCheck = jest.fn().mockResolvedValue({ loki: { status: 'up' } });
    config = { logMode: 'log4js', lokiURL: 'http://loki.test:3100' };
    controller = new HealthController(
      config as AppConfig,
      { check } as unknown as HealthCheckService,
      { pingCheck } as unknown as HttpHealthIndicator,
    );
    req = { logData: true } as Request;
  });
  it.each(['live', 'ready'] as const)(
    '%s no consulta dependencias con log4js',
    async (method) => {
      await expect(controller[method](req)).resolves.toBe(result);
      expect(check).toHaveBeenCalledWith([]);
      expect(pingCheck).not.toHaveBeenCalled();
      expect(req.logData).toBe(false);
    },
  );
  it('live tampoco consulta Loki en modo loki', async () => {
    config.logMode = 'loki';
    await controller.live(req);
    expect(check).toHaveBeenCalledWith([]);
    expect(pingCheck).not.toHaveBeenCalled();
  });
  it('ready comprueba Loki con timeout de 3000ms', async () => {
    config.logMode = 'loki';
    check.mockImplementation((indicators: Array<() => Promise<unknown>>) =>
      Promise.all(indicators.map((indicator) => indicator())),
    );
    await expect(controller.ready(req)).resolves.toEqual([
      { loki: { status: 'up' } },
    ]);
    expect(pingCheck).toHaveBeenCalledWith(
      'loki',
      'http://loki.test:3100/ready',
      { timeout: 3000 },
    );
    expect(req.logData).toBe(false);
  });
  it('propaga fallo del indicador Loki', async () => {
    config.logMode = 'loki';
    const error = new Error('unhealthy');
    pingCheck.mockRejectedValue(error);
    check.mockImplementation((indicators: Array<() => Promise<unknown>>) =>
      Promise.all(indicators.map((indicator) => indicator())),
    );
    await expect(controller.ready(req)).rejects.toBe(error);
    expect(req.logData).toBe(false);
  });
  it.each(['live', 'ready'] as const)(
    '%s propaga fallo del servicio de salud',
    async (method) => {
      const error = new Error('health failed');
      check.mockRejectedValue(error);
      await expect(controller[method](req)).rejects.toBe(error);
    },
  );
});
