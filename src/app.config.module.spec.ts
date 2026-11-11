jest.mock('@nestjs/config', () => ({
  ConfigModule: {
    forRoot: jest.fn().mockReturnValue(class ConfigModuleMock {}),
  },
  ConfigService: class ConfigServiceMock {},
}));
import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigModule } from './app.config.module';
import { AppConfig } from './app.config';

describe('AppConfigModule', () => {
  const validConfig = {
    PORT: '3000',
    ENVIRONMENT: 'DEV',
    LOG_MODE: 'log4js',
    LOG_LEVEL: 'INFO',
    AUTH_DATABASE_HOST: 'localhost',
    AUTH_DATABASE_PORT: '5432',
    AUTH_DATABASE_USERNAME: 'user',
    AUTH_DATABASE_PASSWORD: 'test-password',
    AUTH_DATABASE_NAME: 'auth',
    AUTH_DATABASE_SYNCRONIZE: 'false',
    AUTH_DATABASE_LOGGING: 'false',
    AUTH_DATABASE_MIGRATIONSRUN: 'true',
    AUTH_DATABASE_MAXEXECUTIONTIME: '1000',
    JWT_SECRET: 'test-secret',
    JWT_EXPIRESIN: '600',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRESIN: '3600',
  };
  afterEach(() => jest.restoreAllMocks());
  const options = () => jest.mocked(ConfigModule.forRoot).mock.calls[0][0]!;
  it('registra configuracion global y exporta AppConfig', () => {
    expect(options().isGlobal).toBe(true);
    expect(Reflect.getMetadata('__module:global__', AppConfigModule)).toBe(
      true,
    );
    expect(Reflect.getMetadata('providers', AppConfigModule)).toEqual([
      AppConfig,
    ]);
    expect(Reflect.getMetadata('exports', AppConfigModule)).toEqual([
      AppConfig,
    ]);
  });
  it('valida, convierte y conserva variables ajenas', () => {
    expect(
      options().validate!({
        ...validConfig,
        OTHER: 'keep',
      }),
    ).toMatchObject({
      PORT: 3000,
      OTHER: 'keep',
      LOG_DIR: './logs',
      AUTH_DATABASE_PORT: 5432,
      AUTH_DATABASE_SYNCRONIZE: false,
      AUTH_DATABASE_MIGRATIONSRUN: true,
      JWT_EXPIRESIN: 600,
      JWT_REFRESH_EXPIRESIN: 3600,
    });
  });
  it.each(['AUTH_DATABASE_HOST', 'JWT_SECRET', 'JWT_REFRESH_SECRET'])(
    'requiere %s en la configuracion global',
    (key) => {
      const input: Record<string, unknown> = { ...validConfig };
      delete input[key];
      expect(() => options().validate!(input)).toThrow(`"${key}" is required`);
    },
  );
  it('informa todos los errores de configuracion', () => {
    expect(() => options().validate!({})).toThrow(
      /Config validation error:.*PORT.*ENVIRONMENT.*LOG_MODE.*LOG_LEVEL/,
    );
  });
  it('registra la inicializacion', () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation();
    new AppConfigModule().onModuleInit();
    expect(log).toHaveBeenCalledWith('AppConfigModule initialized');
  });
});
