import type { ConfigService } from '@nestjs/config';
import { AppConfig, appConfigSchema } from './app.config';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));

describe('AppConfig', () => {
  it.each([
    ['port', 'PORT', 3000],
    ['environment', 'ENVIRONMENT', 'QA'],
    ['appName', 'APP_NAME', 'app'],
    ['appDescription', 'APP_DESCRIPTION', 'description'],
    ['appVersion', 'APP_VERSION', '1.0'],
    ['logMode', 'LOG_MODE', 'loki'],
    ['logLevel', 'LOG_LEVEL', 'WARN'],
    ['logDir', 'LOG_DIR', './logs'],
    ['logName', 'LOG_NAME', 'app'],
    ['lokiURL', 'LOKI_URL', 'http://loki'],
  ] as const)(
    'obtiene %s desde %s y propaga errores de configuración',
    (property, key, value) => {
      const getOrThrow = jest.fn().mockReturnValue(value);
      const config = new AppConfig({ getOrThrow } as unknown as ConfigService);
      expect(config[property]).toBe(value);
      expect(getOrThrow).toHaveBeenCalledWith(key);
      const error = new Error('missing ' + key);
      getOrThrow.mockImplementation(() => {
        throw error;
      });
      expect(() => config[property]).toThrow(error);
    },
  );
});

describe('appConfigSchema', () => {
  const base = {
    PORT: 3000,
    ENVIRONMENT: 'QA',
    LOG_MODE: 'log4js',
    LOG_LEVEL: 'INFO',
  };

  it('aplica los valores predeterminados para log4js', () => {
    const result = appConfigSchema.validate(base);
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      ...base,
      APP_NAME: 'base-nestjs-backend',
      APP_DESCRIPTION: '',
      APP_VERSION: '1.0.0',
      LOG_DIR: './logs',
      LOG_NAME: 'base-nestjs-backend',
    });
  });

  it.each(['http://loki:3100', 'https://loki.example.com'])(
    'acepta URL Loki %s y archivos opcionales',
    (url) => {
      expect(
        appConfigSchema.validate({
          ...base,
          LOG_MODE: 'loki',
          LOKI_URL: url,
          LOG_DIR: null,
          LOG_NAME: '',
        }).error,
      ).toBeUndefined();
    },
  );

  it.each([undefined, '', '/relative', 'ftp://loki'])(
    'rechaza URL Loki inválida %s',
    (url) => {
      expect(
        appConfigSchema.validate({ ...base, LOG_MODE: 'loki', LOKI_URL: url })
          .error,
      ).toBeDefined();
    },
  );

  it.each([
    { PORT: -1 },
    { PORT: 65536 },
    { PORT: undefined },
    { ENVIRONMENT: 'UNKNOWN' },
    { LOG_MODE: 'other' },
    { LOG_LEVEL: 'other' },
  ])('rechaza configuración inválida %s', (change) => {
    expect(
      appConfigSchema.validate({ ...base, ...change }).error,
    ).toBeDefined();
  });

  it('admite límites de puerto y descripción vacía', () => {
    for (const PORT of [0, 65535]) {
      expect(
        appConfigSchema.validate({
          ...base,
          PORT,
          APP_DESCRIPTION: '',
          LOKI_URL: null,
        }).error,
      ).toBeUndefined();
    }
  });
});
