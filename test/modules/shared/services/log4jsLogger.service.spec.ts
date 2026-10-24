import * as log4js from 'log4js';
import { AppConfig } from '../../../../src/app.config';

jest.mock('log4js', () => ({ configure: jest.fn(), getLogger: jest.fn() }));

describe('Log4jsLoggerService', () => {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };
  const config = {
    appName: 'test-app',
    logDir: './test-logs',
    logLevel: 'WARN',
  } as AppConfig;
  let Service: typeof import('../../../../src/modules/shared/services/log4jsLogger.service').Log4jsLoggerService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(log4js.getLogger)
      .mockReturnValue(logger as unknown as log4js.Logger);
    // A fresh module isolates the process-wide configuration flag between tests.
    jest.isolateModules(() => {
      Service =
        require('../../../../src/modules/shared/services/log4jsLogger.service').Log4jsLoggerService;
    });
  });

  it('configura consola, rotación y nivel una sola vez para varias instancias', () => {
    new Service(config);
    new Service(config);
    expect(log4js.configure).toHaveBeenCalledTimes(1);
    expect(log4js.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        appenders: expect.objectContaining({
          console: { type: 'stdout' },
          file: expect.objectContaining({
            type: 'dateFile',
            filename: './test-logs/test-app',
            pattern: 'yyyy-MM-dd.log',
            maxLogSize: 2 * 1024 * 1024,
            numBackups: 30,
            compress: false,
          }),
        }),
        categories: {
          default: { appenders: ['console', 'file'], level: 'WARN' },
        },
      }),
    );
    expect(log4js.getLogger).toHaveBeenCalledWith('test-app');
  });

  it.each([
    ['log', 'info'],
    ['error', 'error'],
    ['warn', 'warn'],
    ['debug', 'debug'],
    ['verbose', 'trace'],
  ] as const)(
    'delegación de %s a %s conservando los parámetros',
    (method, level) => {
      new Service(config)[method]('message', { id: 1 }, 'context');
      expect(logger[level]).toHaveBeenCalledWith(
        'message',
        { id: 1 },
        'context',
      );
    },
  );
});
