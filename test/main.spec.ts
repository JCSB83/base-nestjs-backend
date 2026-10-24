import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppConfig } from '../src/app.config';
import { Log4jsLoggerService } from '../src/modules/shared/services/log4jsLogger.service';
import { LokiLoggerService } from '../src/modules/shared/services/lokiLogger.service';
import { LogInterceptor } from '../src/modules/shared/interceptors/log.interceptor';

jest.mock('../src/app.module', () => ({ AppModule: class {} }));
jest.mock('@nestjs/common', () => jest.requireActual('@nestjs/common'));
jest.mock('@nestjs/core', () => ({
  ...jest.requireActual('@nestjs/core'),
  NestFactory: { create: jest.fn() },
}));
jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: class {
    private info = { title: '', description: '', version: '' };
    setTitle(value: string) {
      this.info.title = value;
      return this;
    }
    setDescription(value: string) {
      this.info.description = value;
      return this;
    }
    setVersion(value: string) {
      this.info.version = value;
      return this;
    }
    build() {
      return { info: this.info };
    }
  },
  SwaggerModule: { createDocument: jest.fn(), setup: jest.fn() },
}));

describe('Arranque y apagado', () => {
  const config = {
    appName: 'test-app',
    appDescription: 'Test API',
    appVersion: '1.2.3',
    port: 3210,
    logMode: 'log4js',
  };
  const log4js = {};
  const loki = {};
  const interceptor = {};
  const app = {
    get: jest.fn(),
    useLogger: jest.fn(),
    useGlobalPipes: jest.fn(),
    useGlobalInterceptors: jest.fn(),
    listen: jest.fn(),
    close: jest.fn(),
  };
  const signals = new Map<string, () => void>();
  let previousExitCode: typeof process.exitCode;
  const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
  const start = async () => {
    jest.isolateModules(() => {
      require('../src/main');
    });
    await settle();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    previousExitCode = process.exitCode;
    signals.clear();
    config.logMode = 'log4js';
    app.get.mockImplementation((token) => {
      if (token === AppConfig || token.name === 'AppConfig') return config;
      if (token === Log4jsLoggerService || token.name === 'Log4jsLoggerService')
        return log4js;
      if (token === LokiLoggerService || token.name === 'LokiLoggerService')
        return loki;
      if (token === LogInterceptor || token.name === 'LogInterceptor')
        return interceptor;
      throw new Error('Unexpected provider');
    });
    app.listen.mockImplementation(async (_port, callback) => {
      callback();
    });
    app.close.mockResolvedValue(undefined);
    jest.mocked(NestFactory.create).mockResolvedValue(app as never);
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(SwaggerModule, 'createDocument').mockReturnValue({} as never);
    jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined);
    jest.spyOn(process, 'once').mockImplementation(((
      signal: string,
      callback: () => void,
    ) => {
      signals.set(signal, callback);
      return process;
    }) as typeof process.once);
  });
  afterEach(() => {
    process.exitCode = previousExitCode;
    jest.restoreAllMocks();
  });

  it.each(['log4js', 'loki'])(
    'arranca con %s, Swagger, validación y puerto configurado',
    async (mode) => {
      config.logMode = mode;
      await start();
      expect(app.useLogger).toHaveBeenCalledWith(
        mode === 'log4js' ? log4js : loki,
      );
      expect(app.useGlobalInterceptors).toHaveBeenCalledWith(interceptor);
      expect(app.useGlobalPipes).toHaveBeenCalledWith(
        expect.objectContaining({
          validatorOptions: expect.objectContaining({
            whitelist: true,
            forbidNonWhitelisted: true,
          }),
          isTransformEnabled: true,
        }),
      );
      expect(SwaggerModule.createDocument).toHaveBeenCalledWith(
        app,
        expect.objectContaining({
          info: expect.objectContaining({
            title: 'test-app',
            description: 'Test API',
            version: '1.2.3',
          }),
        }),
      );
      expect(SwaggerModule.setup).toHaveBeenCalledWith('swagger', app, {});
      expect(app.listen).toHaveBeenCalledWith(3210, expect.any(Function));
      expect(Logger.log).toHaveBeenCalledWith('test-app running on port 3210');
    },
  );

  it.each(['SIGINT', 'SIGTERM'])(
    'cierra la aplicación con %s sin cerrar dos veces',
    async (signal) => {
      await start();
      signals.get(signal)!();
      signals.get(signal === 'SIGINT' ? 'SIGTERM' : 'SIGINT')!();
      await settle();
      expect(app.close).toHaveBeenCalledTimes(1);
      expect(process.exitCode).toBe(0);
    },
  );

  it('registra un cierre fallido y establece código de salida 1', async () => {
    const error = new Error('close failed');
    app.close.mockRejectedValue(error);
    await start();
    signals.get('SIGTERM')!();
    await settle();
    expect(Logger.error).toHaveBeenCalledWith(
      'Error closing application',
      error,
    );
    expect(process.exitCode).toBe(1);
  });
});
