import axios from 'axios';
import type { AppConfig } from '@/app.config';
import { LokiLoggerService } from './lokiLogger.service';

jest.mock('@/app.config', () => ({ AppConfig: class {} }));

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

describe('LokiLoggerService', () => {
  const post = jest.fn<Promise<unknown>, [string, unknown]>();
  const config = {
    lokiURL: 'http://loki:3100',
    appName: 'app',
    environment: 'QA',
    logLevel: 'ALL',
  };
  let service: LokiLoggerService;
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-01-02T03:04:05Z'));
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    config.logLevel = 'ALL';
    post.mockResolvedValue({});
    jest
      .spyOn(axios, 'create')
      .mockReturnValue({ post } as unknown as ReturnType<typeof axios.create>);
    service = new LokiLoggerService(config as AppConfig);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('configura el cliente con URL, timeout y JSON', () => {
    expect(jest.spyOn(axios, 'create')).toHaveBeenCalledWith({
      baseURL: config.lokiURL,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it.each([
    ['log', 'info', 'log'],
    ['error', 'error', 'log'],
    ['warn', 'warn', 'log'],
    ['debug', 'debug', 'debug'],
    ['verbose', 'trace', 'log'],
  ] as const)(
    'envía %s con etiquetas, timestamp y parámetros',
    async (method, level, output) => {
      service[method]('message', { id: 1 }, 'context');
      await flush();
      expect(post).toHaveBeenCalledWith('/loki/api/v1/push', {
        streams: [
          {
            stream: { app: 'app', environment: 'QA', level },
            values: [
              [
                Date.now() + '000000',
                JSON.stringify({
                  message: 'message',
                  params: [{ id: 1 }, 'context'],
                }),
              ],
            ],
          },
        ],
      });
      expect(jest.spyOn(console, output)).toHaveBeenCalledWith(
        expect.stringContaining('[loki ON] [' + level.toUpperCase() + ']'),
      );
    },
  );

  it.each(['OFF', 'FATAL'])(
    'omite todos los métodos si el umbral es %s',
    async (threshold) => {
      config.logLevel = threshold;
      for (const method of [
        'log',
        'error',
        'warn',
        'debug',
        'verbose',
      ] as const)
        service[method]('hidden');
      await flush();
      expect(post).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    },
  );

  it('incluye el umbral WARN y excluye niveles inferiores', async () => {
    config.logLevel = 'WARN';
    service.log('hidden');
    service.debug('hidden');
    service.verbose('hidden');
    service.warn('warning');
    service.error('error');
    await flush();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('serializa errores con stack y parámetros', async () => {
    const error = new Error('failure');
    service.error(error, 'context');
    await flush();
    expect(post).toHaveBeenCalledWith('/loki/api/v1/push', {
      streams: [
        {
          stream: { app: 'app', environment: 'QA', level: 'error' },
          values: [
            [
              Date.now() + '000000',
              JSON.stringify({
                message: error.message,
                stack: error.stack,
                params: ['context'],
              }),
            ],
          ],
        },
      ],
    });
  });

  it.each([null, undefined, '', { id: 1 }])(
    'serializa mensajes %s',
    async (message: unknown) => {
      service.log(message);
      await flush();
      expect(post).toHaveBeenCalledWith('/loki/api/v1/push', {
        streams: [
          {
            stream: { app: 'app', environment: 'QA', level: 'info' },
            values: [
              [Date.now() + '000000', JSON.stringify({ message, params: [] })],
            ],
          },
        ],
      });
    },
  );

  it('absorbe fallos HTTP, muestra Loki OFF y evita recursión', async () => {
    const error = new Error('network down');
    post.mockRejectedValue(error);
    expect(() => service.error('failure')).not.toThrow();
    await flush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      'Error enviando log a Loki:',
      error,
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[loki OFF] [ERROR]'),
    );
  });
});
