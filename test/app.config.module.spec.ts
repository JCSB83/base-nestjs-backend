import { ConfigModule } from '@nestjs/config';
import type { ObjectSchema } from 'joi';

jest.mock('@nestjs/config', () => ({
  ConfigModule: { forRoot: jest.fn(() => class MockConfigModule {}) },
  ConfigService: class {},
}));

import { AppConfigModule } from '../src/app.config.module';

describe('Validación de configuración', () => {
  const valid = {
    PORT: '3210',
    ENVIRONMENT: 'LOCAL',
    LOG_MODE: 'log4js',
    LOG_LEVEL: 'INFO',
  };
  let schema: ObjectSchema;

  beforeAll(() => {
    expect(AppConfigModule).toBeDefined();
    schema = jest.mocked(ConfigModule.forRoot).mock.calls[0][0]!
      .validationSchema as ObjectSchema;
  });

  it('convierte el puerto y aplica valores predeterminados', () => {
    const result = schema.validate(valid);
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      PORT: 3210,
      APP_NAME: 'base-nestjs-backend',
      APP_DESCRIPTION: '',
      APP_VERSION: '1.0.0',
      LOG_DIR: './logs',
      LOG_NAME: 'base-nestjs-backend',
    });
  });

  it.each(['PORT', 'ENVIRONMENT', 'LOG_MODE', 'LOG_LEVEL'])(
    'rechaza la ausencia de %s',
    (key) => {
      const input: Record<string, unknown> = { ...valid };
      delete input[key];
      expect(schema.validate(input).error?.message).toContain(key);
    },
  );

  it.each([
    ['PORT', 65536],
    ['PORT', 'abc'],
    ['ENVIRONMENT', 'invalid'],
    ['LOG_MODE', 'console'],
    ['LOG_LEVEL', 'invalid'],
  ])('rechaza %s=%s', (key, value) => {
    expect(schema.validate({ ...valid, [key]: value }).error).toBeDefined();
  });

  it.each(['LOCAL', 'DEV', 'QA', 'PROD'])(
    'acepta el entorno %s',
    (environment) => {
      expect(
        schema.validate({ ...valid, ENVIRONMENT: environment }).error,
      ).toBeUndefined();
    },
  );

  it('acepta Loki con URL explícita y campos de archivo vacíos', () => {
    expect(
      schema.validate({
        ...valid,
        LOG_MODE: 'loki',
        LOKI_URL: 'http://localhost:3100',
        LOG_DIR: '',
        LOG_NAME: null,
      }).error,
    ).toBeUndefined();
  });

  it.each([undefined, '', null, '/relative', 'loki', 'ftp://localhost:3100'])(
    'rechaza LOKI_URL inválida en modo Loki: %s',
    (url) => {
      expect(
        schema.validate({ ...valid, LOG_MODE: 'loki', LOKI_URL: url }).error
          ?.message,
      ).toContain('LOKI_URL');
    },
  );

  it.each(['http://localhost:3100', 'https://loki.example.com'])(
    'acepta URL absoluta HTTP(S): %s',
    (url) => {
      expect(
        schema.validate({ ...valid, LOG_MODE: 'loki', LOKI_URL: url }).error,
      ).toBeUndefined();
    },
  );

  it('permite omitir LOKI_URL en modo Log4js', () => {
    expect(schema.validate(valid).error).toBeUndefined();
    expect(schema.validate(valid).value.LOKI_URL).toBeUndefined();
  });
});
