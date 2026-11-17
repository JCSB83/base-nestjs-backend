import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppConfig } from '@/app.config';
import { LOGGER_SERVICE, SharedModule } from './shared.module';
import { LokiLoggerService } from './services/lokiLogger.service';
import { Log4jsLoggerService } from './services/log4jsLogger.service';

jest.mock('@/app.config', () => ({ AppConfig: class {} }));
jest.mock('./services/lokiLogger.service', () => ({
  LokiLoggerService: jest.fn(),
}));
jest.mock('./services/log4jsLogger.service', () => ({
  Log4jsLoggerService: jest.fn(),
}));

describe('SharedModule', () => {
  type Provider = {
    provide: symbol;
    inject: unknown[];
    useFactory: (config: AppConfig) => unknown;
  };
  function provider(): Provider {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      SharedModule,
    ) as unknown[];
    return providers.find(
      (entry): entry is Provider =>
        typeof entry === 'object' &&
        entry !== null &&
        'provide' in entry &&
        entry.provide === LOGGER_SERVICE,
    )!;
  }

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['loki', LokiLoggerService],
    ['log4js', Log4jsLoggerService],
  ] as const)(
    'selecciona el logger %s e inyecta su configuración',
    (logMode, Service) => {
      const config = { logMode } as AppConfig;
      const instance = {};
      jest
        .mocked(LokiLoggerService)
        .mockImplementation(() => instance as LokiLoggerService);
      jest
        .mocked(Log4jsLoggerService)
        .mockImplementation(() => instance as Log4jsLoggerService);
      expect(provider().inject).toEqual([AppConfig]);
      expect(provider().useFactory(config)).toBe(instance);
      expect(Service).toHaveBeenCalledWith(config);
      const other =
        logMode === 'loki' ? Log4jsLoggerService : LokiLoggerService;
      expect(other).not.toHaveBeenCalled();
    },
  );

  it('rechaza proveedores desconocidos', () => {
    expect(() =>
      provider().useFactory({ logMode: 'invalid' } as AppConfig),
    ).toThrow('Invalid logger provider');
    expect(LokiLoggerService).not.toHaveBeenCalled();
    expect(Log4jsLoggerService).not.toHaveBeenCalled();
  });

  it('registra su inicialización', () => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    new SharedModule().onModuleInit();
    expect(jest.mocked(Logger).log).toHaveBeenCalledWith(
      'SharedModule initialized',
    );
  });
});
