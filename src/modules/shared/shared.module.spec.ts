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
import { LoggerService } from '@nestjs/common';
import { AppConfig } from 'src/app.config';
import { SharedModule, LOGGER_SERVICE } from './shared.module';
import { Log4jsLoggerService } from './services/log4jsLogger.service';
import { LokiLoggerService } from './services/lokiLogger.service';
import { LogInterceptor } from './interceptors/log.interceptor';
import { HealthController } from './controllers/health.controller';
import { TerminusModule } from '@nestjs/terminus';
describe('SharedModule', () => {
  type Factory = {
    provide: symbol;
    inject: unknown[];
    useFactory: (config: AppConfig) => LoggerService;
  };
  const providers = Reflect.getMetadata('providers', SharedModule) as (
    Factory | typeof LogInterceptor
  )[];
  const factory = providers.find(
    (provider): provider is Factory =>
      typeof provider === 'object' && provider.provide === LOGGER_SERVICE,
  )!;
  beforeEach(() => jest.clearAllMocks());
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
