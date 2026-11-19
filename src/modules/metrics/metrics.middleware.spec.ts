import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AppConfig } from '@/app.config';
import { MetricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';

jest.mock('@/app.config', () => ({ AppConfig: class {} }));

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  const incrementCounter = jest.fn();
  const observeHistogram = jest.fn();
  let res: EventEmitter & { statusCode: number; writableFinished: boolean };
  let req: Request;
  const next = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .spyOn(process.hrtime, 'bigint')
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValue(1_250_000_000n);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    middleware = new MetricsMiddleware(
      { appName: '9my-app', environment: 'QA' } as AppConfig,
      { incrementCounter, observeHistogram } as unknown as MetricsService,
    );
    req = {
      method: 'GET',
      baseUrl: '/api',
      route: { path: '/users/:id' },
    } as Request;
    res = Object.assign(new EventEmitter(), {
      statusCode: 201,
      writableFinished: false,
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('registra duración en segundos, ruta parametrizada y nombre sanitizado al terminar', () => {
    middleware.use(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(incrementCounter).not.toHaveBeenCalled();
    res.emit('finish');
    const labels = {
      environment: 'QA',
      method: 'GET',
      route: '/api/users/:id',
      status_code: '201',
    };
    expect(incrementCounter).toHaveBeenCalledWith(
      '_9my_app_http_requests_total',
      'Total HTTP requests',
      labels,
    );
    expect(observeHistogram).toHaveBeenCalledWith(
      '_9my_app_http_request_duration_seconds',
      'HTTP request duration in seconds',
      labels,
      0.25,
    );
  });

  it('registra solicitudes abortadas y rutas no encontradas una sola vez', () => {
    req = { method: 'POST', baseUrl: '' } as Request;
    middleware.use(req, res as unknown as Response, next);
    res.emit('close');
    res.emit('finish');
    expect(incrementCounter).toHaveBeenCalledTimes(1);
    expect(incrementCounter).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      {
        environment: 'QA',
        method: 'POST',
        route: 'unmatched',
        status_code: 'aborted',
      },
    );
  });

  it('no duplica finish seguido de close aunque writableFinished siga falso', () => {
    middleware.use(req, res as unknown as Response, next);
    res.emit('finish');
    res.emit('close');
    expect(incrementCounter).toHaveBeenCalledTimes(1);
  });

  it('ignora close si la respuesta ya terminó', () => {
    middleware.use(req, res as unknown as Response, next);
    res.writableFinished = true;
    res.emit('close');
    expect(incrementCounter).not.toHaveBeenCalled();
  });

  it.each(['counter', 'histogram'])(
    'absorbe y registra errores de %s sin reintentar',
    (dependency) => {
      const error = new Error('metrics failed');
      (dependency === 'counter'
        ? incrementCounter
        : observeHistogram
      ).mockImplementation(() => {
        throw error;
      });
      middleware.use(req, res as unknown as Response, next);
      expect(() => res.emit('finish')).not.toThrow();
      res.emit('close');
      expect(jest.mocked(Logger).error).toHaveBeenCalledWith(
        'Error trying to add metrics',
        {
          error: error.message,
          stack: error.stack,
        },
      );
      expect(incrementCounter).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
    },
  );
});
