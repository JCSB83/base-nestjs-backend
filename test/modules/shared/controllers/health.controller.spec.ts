import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import type { Request } from 'express';
import { AppConfig } from '../../../../src/app.config';
import { HealthController } from '../../../../src/modules/shared/controllers/health.controller';

describe('HealthController', () => {
  const result = { status: 'ok', info: {}, error: {}, details: {} };
  const check = jest.fn();
  const pingCheck = jest.fn();
  const config = { logMode: 'log4js', lokiURL: 'http://loki.test:3100' };
  let controller: HealthController;
  let req: Request;

  beforeEach(() => {
    jest.resetAllMocks();
    config.logMode = 'log4js';
    check.mockResolvedValue(result);
    req = { logData: true } as Request;
    controller = new HealthController(
      config as AppConfig,
      { check } as unknown as HealthCheckService,
      { pingCheck } as unknown as HttpHealthIndicator,
    );
  });

  it('live devuelve salud sin consultar dependencias ni registrar el cuerpo', async () => {
    await expect(controller.live(req)).resolves.toEqual(result);
    expect(check).toHaveBeenCalledWith([]);
    expect(pingCheck).not.toHaveBeenCalled();
    expect(req.logData).toBe(false);
  });

  it('ready no consulta Loki en modo log4js', async () => {
    await expect(controller.ready(req)).resolves.toEqual(result);
    expect(check).toHaveBeenCalledWith([]);
    expect(pingCheck).not.toHaveBeenCalled();
    expect(req.logData).toBe(false);
  });

  it('ready comprueba Loki con un timeout de tres segundos', async () => {
    config.logMode = 'loki';
    pingCheck.mockResolvedValue({ loki: { status: 'up' } });
    check.mockImplementation(async (indicators) =>
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

  it('propaga los fallos de la comprobación de salud', async () => {
    config.logMode = 'loki';
    const error = new Error('Loki unavailable');
    pingCheck.mockRejectedValue(error);
    check.mockImplementation(async (indicators) =>
      Promise.all(indicators.map((indicator) => indicator())),
    );
    await expect(controller.ready(req)).rejects.toBe(error);
  });
});
