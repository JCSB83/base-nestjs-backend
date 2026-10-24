import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../src/app.config';

describe('AppConfig', () => {
  const values = {
    PORT: 3210,
    ENVIRONMENT: 'LOCAL',
    APP_NAME: 'test-app',
    APP_DESCRIPTION: '',
    APP_VERSION: '1.2.3',
    LOG_MODE: 'loki',
    LOG_LEVEL: 'INFO',
    LOG_DIR: './logs',
    LOG_NAME: 'test',
    LOKI_URL: 'http://localhost:3100',
  };
  const properties: [keyof AppConfig, keyof typeof values][] = [
    ['port', 'PORT'],
    ['environment', 'ENVIRONMENT'],
    ['appName', 'APP_NAME'],
    ['appDescription', 'APP_DESCRIPTION'],
    ['appVersion', 'APP_VERSION'],
    ['logMode', 'LOG_MODE'],
    ['logLevel', 'LOG_LEVEL'],
    ['logDir', 'LOG_DIR'],
    ['logName', 'LOG_NAME'],
    ['lokiURL', 'LOKI_URL'],
  ];

  it.each(properties)('obtiene %s desde %s', (property, variable) => {
    const config = new AppConfig(new ConfigService(values));
    expect(config[property]).toBe(values[variable]);
  });

  it('propaga la ausencia de una variable obligatoria', () => {
    const service = new ConfigService({});
    jest.spyOn(service, 'getOrThrow').mockImplementation(() => {
      throw new Error('Missing PORT');
    });
    expect(() => new AppConfig(service).port).toThrow('Missing PORT');
  });
});
