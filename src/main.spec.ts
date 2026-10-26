jest.mock('@nestjs/core', () => ({ NestFactory: { create: jest.fn() } }));
jest.mock('@nestjs/common', () => jest.requireActual('@nestjs/common'));
jest.mock('./app.config', () => ({ AppConfig: class AppConfigMock {} }));
jest.mock('./app.module', () => ({ AppModule: class AppModuleMock {} }));
jest.mock('./modules/shared/shared.module', () => ({
  LOGGER_SERVICE: 'LOGGER_SERVICE',
}));
jest.mock('./modules/shared/interceptors/log.interceptor', () => ({
  LogInterceptor: class LogInterceptorMock {},
}));
jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ openapi: 'test-document' }),
  })),
  SwaggerModule: { createDocument: jest.fn(), setup: jest.fn() },
}));

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfig } from './app.config';
import { AppModule } from './app.module';
import { LogInterceptor } from './modules/shared/interceptors/log.interceptor';

describe('bootstrap', () => {
  const config = {
    appName: 'test-api',
    appDescription: 'description',
    appVersion: '2.0',
    port: 4321,
  };
  const logger = { log: jest.fn() };
  const interceptor = {};
  let signals: Map<string | symbol, () => void>;
  let app: {
    get: jest.Mock;
    useLogger: jest.Mock;
    useGlobalPipes: jest.Mock;
    useGlobalInterceptors: jest.Mock;
    listen: jest.Mock;
    close: jest.Mock;
  };
  let originalExitCode: typeof process.exitCode;
  const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
  async function start() {
    // Re-evaluate only the entry point; retain shared mock identities.
    jest.isolateModules(() => {
      jest.requireActual('./main');
    });
    await settle();
  }

  beforeEach(() => {
    jest.clearAllMocks();
    originalExitCode = process.exitCode;
    signals = new Map();
    jest.spyOn(process, 'once').mockImplementation((event, listener) => {
      signals.set(event, listener as () => void);
      return process;
    });
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.spyOn(Logger, 'log').mockImplementation();
    jest.spyOn(Logger, 'error').mockImplementation();
    app = {
      get: jest.fn((token: unknown) => {
        if (token === AppConfig) return config;
        if (token === LogInterceptor) return interceptor;
        if (token === 'LOGGER_SERVICE') return logger;
        throw new Error('Unexpected provider');
      }),
      useLogger: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      listen: jest.fn().mockImplementation((_port, callback: () => void) => {
        callback();
        return Promise.resolve();
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    jest.mocked(NestFactory.create).mockResolvedValue(app as never);
    jest
      .mocked(SwaggerModule.createDocument)
      .mockReturnValue({ paths: {} } as never);
  });
  afterEach(() => {
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  it('configura Swagger, logger, validacion e interceptores antes de escuchar', async () => {
    await start();
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule, {
      bufferLogs: true,
    });
    const builder = jest.mocked(DocumentBuilder).mock.results[0].value;
    expect(builder.setTitle).toHaveBeenCalledWith(config.appName);
    expect(builder.setDescription).toHaveBeenCalledWith(config.appDescription);
    expect(builder.setVersion).toHaveBeenCalledWith(config.appVersion);
    expect(SwaggerModule.createDocument).toHaveBeenCalledWith(app, {
      openapi: 'test-document',
    });
    expect(SwaggerModule.setup).toHaveBeenCalledWith('swagger', app, {
      paths: {},
    });
    expect(app.useLogger).toHaveBeenCalledWith(logger);
    expect(app.useGlobalInterceptors).toHaveBeenCalledWith(interceptor);
    const pipe = app.useGlobalPipes.mock.calls[0][0] as ValidationPipe;
    expect(pipe).toBeInstanceOf(ValidationPipe);
    expect(
      await pipe.transform('unchanged', { type: 'body', metatype: String }),
    ).toBe('unchanged');
    expect(pipe).toMatchObject({
      isTransformEnabled: true,
      validatorOptions: { whitelist: true, forbidNonWhitelisted: true },
    });
    expect(app.listen).toHaveBeenCalledWith(config.port, expect.any(Function));
    expect(Logger.log).toHaveBeenCalledWith('test-api running on port 4321');
    expect([...signals.keys()]).toEqual(['SIGTERM', 'SIGINT']);
    expect(process.exit).not.toHaveBeenCalled();
  });

  it.each(['SIGTERM', 'SIGINT'])(
    'cierra una sola vez ante %s y señales repetidas',
    async (signal) => {
      await start();
      let finish!: () => void;
      app.close.mockReturnValue(
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
      );
      signals.get(signal)!();
      signals.get('SIGTERM')!();
      signals.get('SIGINT')!();
      expect(app.close).toHaveBeenCalledTimes(1);
      expect(Logger.log).toHaveBeenCalledWith(
        `Closing application (${signal})...`,
      );
      finish();
      await settle();
      expect(process.exitCode).toBe(0);
    },
  );

  it('registra un fallo de cierre y marca salida fallida', async () => {
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

  it.each(['create', 'listen'])(
    'registra y termina ante fallo de %s',
    async (stage) => {
      const error = new Error(`${stage} failed`);
      if (stage === 'create')
        jest.mocked(NestFactory.create).mockRejectedValueOnce(error);
      else app.listen.mockRejectedValueOnce(error);
      await start();
      expect(Logger.error).toHaveBeenCalledWith(
        'Error starting the application:',
        error,
      );
      expect(process.exit).toHaveBeenCalledWith(1);
      if (stage === 'create') expect(app.listen).not.toHaveBeenCalled();
    },
  );
});
