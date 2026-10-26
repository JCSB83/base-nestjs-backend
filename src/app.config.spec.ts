import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppConfig, appConfigSchema } from './app.config';

describe('AppConfig', () => {
  it('recibe ConfigService a traves del contenedor Nest', async () => {
    const getOrThrow = jest.fn().mockReturnValue(3210);
    const module = await Test.createTestingModule({
      providers: [
        AppConfig,
        { provide: ConfigService, useValue: { getOrThrow } },
      ],
    }).compile();
    try {
      expect(module.get(AppConfig).port).toBe(3210);
      expect(getOrThrow).toHaveBeenCalledWith('PORT');
    } finally {
      await module.close();
    }
  });
  it.each([
    ['port', 'PORT', 3000],
    ['environment', 'ENVIRONMENT', 'QA'],
    ['appName', 'APP_NAME', 'api'],
    ['appDescription', 'APP_DESCRIPTION', 'description'],
    ['appVersion', 'APP_VERSION', '2.0'],
    ['logMode', 'LOG_MODE', 'loki'],
    ['logLevel', 'LOG_LEVEL', 'INFO'],
    ['logDir', 'LOG_DIR', './logs'],
    ['logName', 'LOG_NAME', 'api'],
    ['lokiURL', 'LOKI_URL', 'https://loki.example'],
  ] as const)('%s consulta %s y propaga errores', (property, key, value) => {
    const getOrThrow = jest.fn().mockReturnValue(value);
    const config = new AppConfig({ getOrThrow } as unknown as ConfigService);
    expect(config[property]).toBe(value);
    expect(getOrThrow).toHaveBeenCalledWith(key);
    const error = new Error(`Missing ${key}`);
    getOrThrow.mockImplementation(() => {
      throw error;
    });
    expect(() => config[property]).toThrow(error);
  });
});

describe('appConfigSchema', () => {
  const valid = {
    PORT: 3000,
    ENVIRONMENT: 'LOCAL',
    LOG_MODE: 'log4js',
    LOG_LEVEL: 'INFO',
  };
  it('aplica valores predeterminados y convierte el puerto', () => {
    const result = appConfigSchema.validate({ ...valid, PORT: '8080' });
    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      ...valid,
      PORT: 8080,
      APP_NAME: 'base-nestjs-backend',
      APP_DESCRIPTION: '',
      APP_VERSION: '1.0.0',
      LOG_DIR: './logs',
      LOG_NAME: 'base-nestjs-backend',
    });
  });
  it.each(['LOCAL', 'DEV', 'QA', 'PROD'])(
    'acepta entorno %s',
    (ENVIRONMENT) => {
      expect(
        appConfigSchema.validate({ ...valid, ENVIRONMENT }).error,
      ).toBeUndefined();
    },
  );
  it.each([0, 65535])('acepta el puerto limite %s', (PORT) => {
    expect(appConfigSchema.validate({ ...valid, PORT }).error).toBeUndefined();
  });
  it.each([
    'ALL',
    'TRACE',
    'DEBUG',
    'INFO',
    'WARN',
    'ERROR',
    'FATAL',
    'MARK',
    'OFF',
  ])('acepta el nivel de log %s', (LOG_LEVEL) => {
    expect(
      appConfigSchema.validate({ ...valid, LOG_LEVEL }).error,
    ).toBeUndefined();
  });
  it.each([1.5, 'invalid', null])('rechaza un puerto no entero: %j', (PORT) => {
    expect(appConfigSchema.validate({ ...valid, PORT }).error).toBeDefined();
  });
  it.each([
    { PORT: -1 },
    { PORT: 65536 },
    { PORT: undefined },
    { ENVIRONMENT: 'unknown' },
    { LOG_MODE: 'unknown' },
    { LOG_LEVEL: 'unknown' },
    { LOG_MODE: 'loki' },
    { LOG_MODE: 'loki', LOKI_URL: '/relative' },
    { LOG_MODE: 'loki', LOKI_URL: 'ftp://example.com' },
  ])('rechaza configuracion invalida %j', (override) => {
    expect(
      appConfigSchema.validate({ ...valid, ...override }).error,
    ).toBeDefined();
  });
  it.each(['http://localhost:3100', 'https://loki.example'])(
    'acepta Loki %s sin archivos locales',
    (LOKI_URL) => {
      const input = {
        ...valid,
        LOG_MODE: 'loki',
        LOKI_URL,
        LOG_DIR: null,
        LOG_NAME: '',
      };
      const result = appConfigSchema.validate(input);
      expect(result.error).toBeUndefined();
      expect(result.value).toMatchObject(input);
    },
  );
});
