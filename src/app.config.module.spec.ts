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
        PORT: '3000',
        ENVIRONMENT: 'DEV',
        LOG_MODE: 'log4js',
        LOG_LEVEL: 'INFO',
        OTHER: 'keep',
      }),
    ).toMatchObject({ PORT: 3000, OTHER: 'keep', LOG_DIR: './logs' });
  });
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
