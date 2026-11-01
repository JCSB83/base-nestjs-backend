jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));
import axios, { AxiosInstance } from 'axios';
import { AppConfig } from 'src/app.config';
import { LogLevel, LokiLoggerService } from './lokiLogger.service';
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
    logLevel: LogLevel.ALL,
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
    {
      threshold: LogLevel.ALL,
      levels: ['trace', 'debug', 'info', 'warn', 'error'],
    },
    {
      threshold: LogLevel.TRACE,
      levels: ['trace', 'debug', 'info', 'warn', 'error'],
    },
    { threshold: LogLevel.DEBUG, levels: ['debug', 'info', 'warn', 'error'] },
    { threshold: LogLevel.INFO, levels: ['info', 'warn', 'error'] },
    { threshold: LogLevel.MARK, levels: ['warn', 'error'] },
    { threshold: LogLevel.WARN, levels: ['warn', 'error'] },
    { threshold: LogLevel.ERROR, levels: ['error'] },
    { threshold: LogLevel.FATAL, levels: [] },
    { threshold: LogLevel.OFF, levels: [] },
  ])(
    'filtra los mensajes con LOG_LEVEL=$threshold',
    async ({ threshold, levels }) => {
      const filteredService = new LokiLoggerService({
        ...config,
        logLevel: threshold,
      } as AppConfig);

      filteredService.verbose('trace');
      filteredService.debug('debug');
      filteredService.log('info');
      filteredService.warn('warn');
      filteredService.error('error');

      expect(post).toHaveBeenCalledTimes(levels.length);
      levels.forEach((level, index) => {
        expect(post).toHaveBeenNthCalledWith(index + 1, '/loki/api/v1/push', {
          streams: [
            {
              stream: { app: 'app', environment: 'TEST', level },
              values: [
                [
                  now.getTime() + '000000',
                  JSON.stringify({ message: level, params: [] }),
                ],
              ],
            },
          ],
        });
      });
      await flush();
      expect(consoleDebug).toHaveBeenCalledTimes(
        levels.includes('debug') ? 1 : 0,
      );
      const consoleLevels = levels.filter((level) => level !== 'debug');
      expect(consoleLog).toHaveBeenCalledTimes(consoleLevels.length);
      consoleLevels.forEach((level, index) => {
        expect(consoleLog).toHaveBeenNthCalledWith(
          index + 1,
          expect.stringContaining(`[loki ON] [${level.toUpperCase()}]`),
        );
      });
      expect(consoleError).not.toHaveBeenCalled();
    },
  );

  it.each(['log', 'error', 'warn', 'debug', 'verbose'] as const)(
    'OFF omite la serializacion de mensajes en %s',
    async (method) => {
      const disabledService = new LokiLoggerService({
        ...config,
        logLevel: LogLevel.OFF,
      } as AppConfig);
      const circular: { self?: unknown } = {};
      circular.self = circular;

      expect(() => disabledService[method](circular)).not.toThrow();
      await flush();
      expect(post).not.toHaveBeenCalled();
      expect(consoleLog).not.toHaveBeenCalled();
      expect(consoleDebug).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    },
  );
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
  it('mantiene independiente el estado de envios concurrentes', async () => {
    let succeed!: () => void;
    let fail!: (error: Error) => void;
    post.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        succeed = resolve;
      }),
    );
    post.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        fail = reject;
      }),
    );
    service.log('first');
    service.log('second');
    const error = new Error('second failed');
    fail(error);
    await flush();
    expect(consoleLog).toHaveBeenCalledTimes(1);
    expect(consoleLog).toHaveBeenLastCalledWith(
      expect.stringContaining(
        '[loki OFF] [INFO] {"message":"second","params":[]}',
      ),
    );
    succeed();
    await flush();
    expect(consoleLog).toHaveBeenCalledTimes(2);
    expect(consoleLog).toHaveBeenLastCalledWith(
      expect.stringContaining(
        '[loki ON] [INFO] {"message":"first","params":[]}',
      ),
    );
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      'Error enviando log a Loki:',
      error,
    );
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('no envia mensajes no serializables', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => service.log(circular)).toThrow(TypeError);
    expect(post).not.toHaveBeenCalled();
  });
});
