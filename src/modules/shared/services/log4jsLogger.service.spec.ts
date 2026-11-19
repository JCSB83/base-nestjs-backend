import * as log4js from 'log4js';
import type { AppConfig } from '@/app.config';
import type { Log4jsLoggerService } from './log4jsLogger.service';

jest.mock('@/app.config', () => ({ AppConfig: class {} }));
jest.mock('log4js', () => ({ configure: jest.fn(), getLogger: jest.fn() }));

describe('Log4jsLoggerService', () => {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };
  let service: Log4jsLoggerService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      const logModule = jest.requireMock<typeof log4js>('log4js');
      jest
        .mocked(logModule.getLogger)
        .mockReturnValue(logger as unknown as log4js.Logger);
      const { Log4jsLoggerService: Service } = jest.requireActual<
        typeof import('./log4jsLogger.service')
      >('./log4jsLogger.service');
      const config = {
        appName: 'app',
        logDir: './logs',
        logLevel: 'WARN',
      } as AppConfig;
      service = new Service(config);
      new Service(config);
      expect(logModule.configure).toHaveBeenCalledTimes(1);
      expect(logModule.getLogger).toHaveBeenCalledWith('app');
      expect(logModule.configure).toHaveBeenCalledWith({
        appenders: {
          console: { type: 'stdout' },
          file: {
            type: 'dateFile',
            filename: './logs/app',
            pattern: 'yyyy-MM-dd.log',
            keepFileExt: true,
            alwaysIncludePattern: true,
            fileNameSep: '-',
            maxLogSize: 2 * 1024 * 1024,
            numBackups: 30,
            compress: false,
            layout: {
              type: 'pattern',
              pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %m',
            },
          },
        },
        categories: {
          default: { appenders: ['console', 'file'], level: 'WARN' },
        },
      });
    });
  });

  it.each([
    ['log', 'info'],
    ['error', 'error'],
    ['warn', 'warn'],
    ['debug', 'debug'],
    ['verbose', 'trace'],
  ] as const)(
    'delega %s con el mensaje y todos sus parámetros',
    (method, target) => {
      service[method]({ message: 'hello' }, 'context', 42);
      expect(logger[target]).toHaveBeenCalledWith(
        { message: 'hello' },
        'context',
        42,
      );
    },
  );
});
