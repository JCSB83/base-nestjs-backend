jest.mock('@nestjs/terminus', () => ({
  TerminusModule: class {},
  HealthCheck: () => () => undefined,
  HealthCheckService: class {},
  HttpHealthIndicator: class {},
}));
jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => () => undefined,
  ApiOperation: () => () => undefined,
}));
jest.mock('./services/log4jsLogger.service', () => ({
  Log4jsLoggerService: jest.fn(),
}));
jest.mock('./services/lokiLogger.service', () => ({
  LokiLoggerService: jest.fn(),
}));
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { AppConfig } from 'src/app.config';
import { SharedModule, LOGGER_SERVICE } from './shared.module';
import { Log4jsLoggerService } from './services/log4jsLogger.service';
import { LokiLoggerService } from './services/lokiLogger.service';
import { LogInterceptor } from './interceptors/log.interceptor';
import { HealthController } from './controllers/health.controller';
import { TerminusModule } from '@nestjs/terminus';
describe('SharedModule', () => {
  type Factory = FactoryProvider<LoggerService>;
  const providers = Reflect.getMetadata('providers', SharedModule) as (
    Factory | typeof LogInterceptor
  )[];
  const factory = providers.find(
    (provider): provider is Factory =>
      typeof provider === 'object' && provider.provide === LOGGER_SERVICE,
  )!;
  beforeEach(() => jest.clearAllMocks());
  it.each(['loki', 'log4js'])(
    'resuelve el modulo y reutiliza el logger %s mediante inyeccion',
    async (logMode) => {
      const config = { logMode } as AppConfig;
      const check = jest.fn().mockResolvedValue({ status: 'ok' });
      const module = await Test.createTestingModule({ imports: [SharedModule] })
        .useMocker((token) => {
          if (token === AppConfig) return config;
          if (token === HealthCheckService) return { check };
          if (token === HttpHealthIndicator) return { pingCheck: jest.fn() };
        })
        .compile();
      try {
        const selected =
          logMode === 'loki' ? LokiLoggerService : Log4jsLoggerService;
        expect(module.get(LOGGER_SERVICE)).toBeInstanceOf(selected);
        expect(module.get(LOGGER_SERVICE)).toBe(module.get(LOGGER_SERVICE));
        expect(selected).toHaveBeenCalledTimes(1);
        expect(selected).toHaveBeenCalledWith(config);
        expect(module.get(LogInterceptor)).toBeInstanceOf(LogInterceptor);
        await expect(
          module
            .get(HealthController)
            .live({} as Parameters<HealthController['live']>[0]),
        ).resolves.toEqual({ status: 'ok' });
        expect(check).toHaveBeenCalledWith([]);
      } finally {
        await module.close();
      }
    },
  );
  it('rechaza la compilacion de Nest con un modo de logger invalido', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          factory,
          {
            provide: AppConfig,
            useValue: { logMode: 'invalid' },
          },
        ],
      }).compile(),
    ).rejects.toThrow('Invalid logger provider');
  });
  it.each(['loki', 'log4js'])(
    'selecciona solamente el proveedor %s',
    (logMode) => {
      const config = { logMode } as AppConfig;
      const logger = factory.useFactory(config);
      const selected =
        logMode === 'loki' ? LokiLoggerService : Log4jsLoggerService;
      const other =
        logMode === 'loki' ? Log4jsLoggerService : LokiLoggerService;
      expect(logger).toBeInstanceOf(selected);
      expect(selected).toHaveBeenCalledWith(config);
      expect(other).not.toHaveBeenCalled();
    },
  );
  it('rechaza un proveedor desconocido', () => {
    expect(() =>
      factory.useFactory({ logMode: 'invalid' } as AppConfig),
    ).toThrow('Invalid logger provider');
    expect(LokiLoggerService).not.toHaveBeenCalled();
    expect(Log4jsLoggerService).not.toHaveBeenCalled();
  });
  it('registra y exporta las dependencias compartidas', () => {
    expect(factory.inject).toEqual([AppConfig]);
    expect(providers).toContain(LogInterceptor);
    expect(Reflect.getMetadata('imports', SharedModule)).toEqual([
      TerminusModule,
    ]);
    expect(Reflect.getMetadata('controllers', SharedModule)).toEqual([
      HealthController,
    ]);
    expect(Reflect.getMetadata('exports', SharedModule)).toEqual([
      LOGGER_SERVICE,
      LogInterceptor,
    ]);
  });
});
