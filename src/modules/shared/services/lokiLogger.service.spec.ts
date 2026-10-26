jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));
import axios, { AxiosInstance } from 'axios';
import { AppConfig } from 'src/app.config';
import { LokiLoggerService } from './lokiLogger.service';
describe('LokiLoggerService', () => {
  let post: jest.Mock;
  let service: LokiLoggerService;
  let consoleLog: jest.SpyInstance;
  let consoleDebug: jest.SpyInstance;
  let consoleError: jest.SpyInstance;
  const now = new Date(2026, 0, 2, 3, 4, 5);
  const config = {
    appName: 'app',
    environment: 'TEST',
    lokiURL: 'http://loki.test',
  } as AppConfig;
  // send returns void; drain the catch/finally microtasks without real timers.
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    post = jest.fn().mockResolvedValue({ status: 204 });
    jest
      .spyOn(axios, 'create')
      .mockReturnValue({ post } as unknown as AxiosInstance);
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleDebug = jest
      .spyOn(console, 'debug')
      .mockImplementation(() => undefined);
    consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    service = new LokiLoggerService(config);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  it('configura URL, timeout y contenido JSON', () => {
    // Inspect the mocked method without invoking it unbound.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://loki.test',
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  it.each([
    { method: 'log', level: 'info', color: 32 },
    { method: 'error', level: 'error', color: 31 },
    { method: 'warn', level: 'warn', color: 33 },
    { method: 'debug', level: 'debug', color: 34 },
    { method: 'verbose', level: 'trace', color: 35 },
  ] as const)(
    '$method envia nivel $level y escribe consola tras la respuesta',
    async ({ method, level, color }) => {
      service[method]('message', { id: 1 }, 'context');
      expect(consoleLog).not.toHaveBeenCalled();
      expect(consoleDebug).not.toHaveBeenCalled();
      const formatted = JSON.stringify({
        message: 'message',
        params: [{ id: 1 }, 'context'],
      });
      expect(post).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledWith('/loki/api/v1/push', {
        streams: [
          {
            stream: { app: 'app', environment: 'TEST', level },
            values: [[now.getTime() + '000000', formatted]],
          },
        ],
      });
      await flush();
      expect(
        level === 'debug' ? consoleDebug : consoleLog,
      ).toHaveBeenCalledWith(
        String.fromCharCode(27) +
          '[' +
          color +
          'm[2026-1-2 3:4:5] [loki ON] [' +
          level.toUpperCase() +
          '] ' +
          formatted +
          String.fromCharCode(27) +
          '[0m',
      );
      expect(consoleError).not.toHaveBeenCalled();
    },
  );
  it('serializa mensaje, stack y parametros de Error', async () => {
    const error = new Error('failed');
    error.stack = 'trace';
    service.error(error, 'context');
    expect(post).toHaveBeenCalledWith('/loki/api/v1/push', {
      streams: [
        {
          stream: { app: 'app', environment: 'TEST', level: 'error' },
          values: [
            [
              now.getTime() + '000000',
              JSON.stringify({
                message: 'failed',
                stack: 'trace',
                params: ['context'],
              }),
            ],
          ],
        },
      ],
    });
    await flush();
  });
  it.each([null, { event: 'event' }, 42])(
    'serializa mensajes estructurados: %j',
    async (message: unknown) => {
      service.log(message);
      expect(post).toHaveBeenCalledWith('/loki/api/v1/push', {
        streams: [
          {
            stream: { app: 'app', environment: 'TEST', level: 'info' },
            values: [
              [
                now.getTime() + '000000',
                JSON.stringify({ message, params: [] }),
              ],
            ],
          },
        ],
      });
      await flush();
    },
  );
  it('registra Loki OFF al fallar HTTP sin reintentos recursivos', async () => {
    const error = new Error('network down');
    post.mockRejectedValue(error);
    expect(() => service.warn('message')).not.toThrow();
    await flush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      'Error enviando log a Loki:',
      error,
    );
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining('[loki OFF] [WARN]'),
    );
  });
  it('propaga fallo de inicializacion del cliente', () => {
    const error = new Error('client failed');
    // Inspect the mocked method without invoking it unbound.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    jest.mocked(axios.create).mockImplementationOnce(() => {
      throw error;
    });
    expect(() => new LokiLoggerService(config)).toThrow(error);
  });
  it('no envia mensajes no serializables', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => service.log(circular)).toThrow(TypeError);
    expect(post).not.toHaveBeenCalled();
  });
});
