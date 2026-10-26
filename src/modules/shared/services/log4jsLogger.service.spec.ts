jest.mock('log4js', () => ({ configure: jest.fn(), getLogger: jest.fn() }));
import * as log4js from 'log4js';
import { AppConfig } from 'src/app.config';
describe('Log4jsLoggerService', () => {
  const config = {
    appName: 'test-app',
    logDir: './logs',
    logLevel: 'WARN',
  } as AppConfig;
  let Service: typeof import('./log4jsLogger.service').Log4jsLoggerService;
  let logger: {
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    trace: jest.Mock;
  };
  beforeEach(() => {
    jest.resetAllMocks();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
    };
    jest
      .mocked(log4js.getLogger)
      .mockReturnValue(logger as unknown as log4js.Logger);
    jest.isolateModules(() => {
      Service = jest.requireActual<typeof import('./log4jsLogger.service')>(
        './log4jsLogger.service',
      ).Log4jsLoggerService;
    });
  });
  it('configura rotacion, formato y nivel una vez entre varias instancias', () => {
    new Service(config);
    new Service(config);
    expect(log4js.configure).toHaveBeenCalledTimes(1);
    expect(log4js.configure).toHaveBeenCalledWith({
      appenders: {
        console: { type: 'stdout' },
        file: {
          type: 'dateFile',
          filename: './logs/test-app',
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
    expect(log4js.getLogger).toHaveBeenCalledTimes(2);
    expect(log4js.getLogger).toHaveBeenCalledWith('test-app');
  });
  it.each([
    ['log', 'info'],
    ['error', 'error'],
    ['warn', 'warn'],
    ['debug', 'debug'],
    ['verbose', 'trace'],
  ] as const)(
    '%s delega a %s conservando mensaje y parametros',
    (method, level) => {
      const message = { event: 'event' };
      new Service(config)[method](message, { id: 1 }, 'context');
      expect(logger[level]).toHaveBeenCalledWith(message, { id: 1 }, 'context');
      expect(logger[level]).toHaveBeenCalledTimes(1);
    },
  );
  it('propaga fallo de configuracion y permite reintentar', () => {
    const error = new Error('config failed');
    jest.mocked(log4js.configure).mockImplementationOnce(() => {
      throw error;
    });
    expect(() => new Service(config)).toThrow(error);
    expect(log4js.getLogger).not.toHaveBeenCalled();
    new Service(config);
    expect(log4js.configure).toHaveBeenCalledTimes(2);
    expect(log4js.getLogger).toHaveBeenCalledTimes(1);
  });
  it('propaga fallos del logger subyacente', () => {
    const error = new Error('write failed');
    logger.info.mockImplementation(() => {
      throw error;
    });
    expect(() => new Service(config).log('message')).toThrow(error);
  });
});
