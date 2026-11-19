import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfig } from './app.config';
import { AppModule } from './app.module';
import { LOGGER_SERVICE } from './modules/shared/shared.module';
import { LogRequestInterceptor } from './modules/shared/interceptors/log-request.interceptor';

jest.mock('@nestjs/core', () => ({ NestFactory: { create: jest.fn() } }));
jest.mock('@nestjs/common', () =>
  jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common'),
);
jest.mock('./app.config', () => ({ AppConfig: class {} }));
jest.mock('./modules/shared/interceptors/log-request.interceptor', () => ({
  LogRequestInterceptor: class {},
}));
jest.mock('./app.module', () => ({
  AppModule: class {},
  ObserveInstrument: jest.fn(),
}));
jest.mock('./modules/shared/shared.module', () => ({
  LOGGER_SERVICE: Symbol('LOGGER_SERVICE'),
}));
jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn(),
  SwaggerModule: { createDocument: jest.fn(), setup: jest.fn() },
}));

describe('bootstrap', () => {
  const config = {
    appName: 'test-app',
    appDescription: 'description',
    appVersion: '1.2.3',
    port: 3000,
  };
  const logger = { log: jest.fn() };
  const interceptor = {};
  const document = {};
  const swaggerConfig = {};
  const builder = {
    setTitle: jest.fn(),
    setDescription: jest.fn(),
    setVersion: jest.fn(),
    addBearerAuth: jest.fn(),
    build: jest.fn(),
  };
  const app = {
    get: jest.fn(),
    useLogger: jest.fn(),
    useGlobalPipes: jest.fn<void, [ValidationPipe]>(),
    useGlobalInterceptors: jest.fn(),
    listen: jest.fn(),
    close: jest.fn(),
  };
  let signals: Map<string | symbol, () => void>;
  let savedExitCode: typeof process.exitCode;

  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };
  const start = async () => {
    await jest.isolateModulesAsync(async () => {
      await import('./main.js');
      await flush();
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    savedExitCode = process.exitCode;
    signals = new Map();
    jest.spyOn(process, 'once').mockImplementation((event, listener) => {
      signals.set(event, listener);
      return process;
    });
    jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    for (const method of [
      'setTitle',
      'setDescription',
      'setVersion',
      'addBearerAuth',
    ] as const) {
      builder[method].mockReturnValue(builder);
    }
    builder.build.mockReturnValue(swaggerConfig);
    jest
      .mocked(DocumentBuilder)
      .mockReturnValue(builder as unknown as DocumentBuilder);
    jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(
        document as ReturnType<typeof SwaggerModule.createDocument>,
      );
    jest
      .spyOn(NestFactory, 'create')
      .mockResolvedValue(
        app as unknown as Awaited<ReturnType<typeof NestFactory.create>>,
      );
    app.get.mockImplementation((token: unknown) => {
      if (token === AppConfig) return config;
      if (token === LOGGER_SERVICE) return logger;
      if (token === LogRequestInterceptor) return interceptor;
      throw new Error('Unexpected injection token');
    });
    app.listen.mockImplementation((_port: number, callback: () => void) => {
      callback();
      return Promise.resolve();
    });
    app.close.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    jest.restoreAllMocks();
  });

  it('configura Swagger, logger, validación e interceptor antes de escuchar', async () => {
    await start();
    expect(jest.spyOn(NestFactory, 'create')).toHaveBeenCalledWith(AppModule, {
      bufferLogs: true
    });
    expect(builder.setTitle).toHaveBeenCalledWith('test-app');
    expect(builder.setDescription).toHaveBeenCalledWith('description');
    expect(builder.setVersion).toHaveBeenCalledWith('1.2.3');
    expect(builder.addBearerAuth).toHaveBeenCalledTimes(1);
    expect(jest.mocked(SwaggerModule).createDocument).toHaveBeenCalledWith(
      app,
      swaggerConfig,
    );
    expect(jest.mocked(SwaggerModule).setup).toHaveBeenCalledWith(
      'swagger',
      app,
      document,
    );
    expect(app.useLogger).toHaveBeenCalledWith(logger);
    expect(app.useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    const pipe = app.useGlobalPipes.mock.calls[0][0];
    class Input {}
    await expect(
      pipe.transform({ extra: true }, { type: 'body', metatype: Input }),
    ).rejects.toThrow('Bad Request');
    await expect(
      pipe.transform({}, { type: 'body', metatype: Input }),
    ).resolves.toBeInstanceOf(Input);
    expect(app.useGlobalInterceptors).toHaveBeenCalledWith(interceptor);
    expect(app.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(jest.mocked(Logger).log).toHaveBeenCalledWith(
      'test-app running on port 3000',
    );
    expect(app.useGlobalInterceptors.mock.invocationCallOrder[0]).toBeLessThan(
      app.listen.mock.invocationCallOrder[0],
    );
    expect([...signals.keys()]).toEqual(['SIGTERM', 'SIGINT']);
  });

  it.each(['SIGTERM', 'SIGINT'])(
    'cierra una sola vez ante %s y señales repetidas',
    async (signal) => {
      await start();
      signals.get(signal)!();
      signals.get(signal === 'SIGTERM' ? 'SIGINT' : 'SIGTERM')!();
      await flush();
      expect(app.close).toHaveBeenCalledTimes(1);
      expect(jest.mocked(Logger).log).toHaveBeenCalledWith(
        'Closing application (' + signal + ')...',
      );
      expect(process.exitCode).toBe(0);
    },
  );

  it('registra fallos al cerrar y establece código 1', async () => {
    const error = new Error('close failed');
    app.close.mockRejectedValue(error);
    await start();
    signals.get('SIGTERM')!();
    await flush();
    expect(jest.mocked(Logger).error).toHaveBeenCalledWith(
      'Error closing application',
      error,
    );
    expect(jest.mocked(process).exitCode).toBe(1);
  });

  it.each(['create', 'listen'])(
    'registra y termina con código 1 si falla %s',
    async (stage) => {
      const error = new Error('startup failed');
      if (stage === 'create')
        jest.spyOn(NestFactory, 'create').mockRejectedValue(error);
      else app.listen.mockRejectedValue(error);
      await start();
      expect(jest.mocked(Logger).error).toHaveBeenCalledWith(
        'Error starting the application:',
        error,
      );
      expect(jest.spyOn(process, 'exit')).toHaveBeenCalledWith(1);
      if (stage === 'create') expect(app.listen).not.toHaveBeenCalled();
    },
  );
});
