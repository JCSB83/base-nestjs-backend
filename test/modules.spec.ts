import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from '../src/app.config';
import { AppModule } from '../src/app.module';
import { AppConfigModule } from '../src/app.config.module';
import { HealthController } from '../src/modules/shared/controllers/health.controller';
import { Log4jsLoggerService } from '../src/modules/shared/services/log4jsLogger.service';
import { LokiLoggerService } from '../src/modules/shared/services/lokiLogger.service';
import { LogInterceptor } from '../src/modules/shared/interceptors/log.interceptor';

jest.mock('@nestjs/config', () => {
  const actual = jest.requireActual('@nestjs/config');
  return {
    ...actual,
    ConfigModule: {
      forRoot: jest.fn(() => ({ module: class MockConfigModule {} })),
    },
  };
});

describe('Módulos y resolución de dependencias', () => {
  afterEach(() => jest.restoreAllMocks());

  it('conecta AppModule, configuración y servicios compartidos sin efectos externos', async () => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    const config = { logMode: 'log4js' };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AppConfig)
      .useValue(config)
      .overrideProvider(Log4jsLoggerService)
      .useValue({})
      .overrideProvider(LokiLoggerService)
      .useValue({})
      .compile();
    try {
      await module.init();
      expect(module.get(AppConfig)).toBe(config);
      expect(module.get(HealthController)).toBeInstanceOf(HealthController);
      expect(module.get(LogInterceptor)).toBeInstanceOf(LogInterceptor);
      expect(module.get(AppConfigModule)).toBeInstanceOf(AppConfigModule);
      expect(Logger.log).toHaveBeenCalledWith('AppModule initialized');
      expect(Logger.log).toHaveBeenCalledWith('AppConfigModule initialized');
      expect(ConfigModule.forRoot).toHaveBeenCalledWith(
        expect.objectContaining({ isGlobal: true }),
      );
    } finally {
      await module.close();
    }
  });
});
