import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from '../src/app.config';
import { AppModule } from '../src/app.module';
import { AppConfigModule } from '../src/app.config.module';
import { HealthController } from '../src/modules/shared/controllers/health.controller';
import { LOGGER_SERVICE } from '../src/modules/shared/shared.module';
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
    const logger = {};
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AppConfig)
      .useValue(config)
      .overrideProvider(LOGGER_SERVICE)
      .useValue(logger)
      .compile();
    try {
      await module.init();
      expect(module.get(AppConfig)).toBe(config);
      expect(module.get(LOGGER_SERVICE)).toBe(logger);
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
