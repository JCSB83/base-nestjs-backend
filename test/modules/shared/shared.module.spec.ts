import { Test } from '@nestjs/testing';
import { AppConfig } from '../../../src/app.config';
import {
  LOGGER_SERVICE,
  SharedModule,
} from '../../../src/modules/shared/shared.module';
import { Log4jsLoggerService } from '../../../src/modules/shared/services/log4jsLogger.service';
import { LokiLoggerService } from '../../../src/modules/shared/services/lokiLogger.service';

jest.mock('../../../src/modules/shared/services/log4jsLogger.service', () => ({
  Log4jsLoggerService: jest.fn().mockImplementation(() => ({ log: jest.fn() })),
}));
jest.mock('../../../src/modules/shared/services/lokiLogger.service', () => ({
  LokiLoggerService: jest.fn().mockImplementation(() => ({ log: jest.fn() })),
}));

describe('Factory LOGGER_SERVICE', () => {
  beforeEach(() => jest.clearAllMocks());

  const compile = (config: object) =>
    Test.createTestingModule({ imports: [SharedModule] })
      .useMocker((token) => (token === AppConfig ? config : undefined))
      .compile();

  it.each(['log4js', 'loki'])(
    'crea solamente el logger %s y lo exporta por token',
    async (mode) => {
      // The unused backend has no configuration: it must never be constructed.
      const config =
        mode === 'loki'
          ? { logMode: mode, lokiURL: 'http://localhost:3100' }
          : { logMode: mode, logDir: './logs', logLevel: 'INFO' };
      const module = await compile(config);
      try {
        const selected =
          mode === 'loki' ? LokiLoggerService : Log4jsLoggerService;
        const unused =
          mode === 'loki' ? Log4jsLoggerService : LokiLoggerService;
        expect(selected).toHaveBeenCalledTimes(1);
        expect(selected).toHaveBeenCalledWith(config);
        expect(unused).not.toHaveBeenCalled();
        expect(module.get(LOGGER_SERVICE)).toBe(
          jest.mocked(selected).mock.results[0].value,
        );
        expect(() => module.get(Log4jsLoggerService)).toThrow();
        expect(() => module.get(LokiLoggerService)).toThrow();
      } finally {
        await module.close();
      }
    },
  );

  it('rechaza un modo desconocido sin construir ningún logger', async () => {
    await expect(compile({ logMode: 'invalid' })).rejects.toThrow(
      'Invalid logger provider',
    );
    expect(Log4jsLoggerService).not.toHaveBeenCalled();
    expect(LokiLoggerService).not.toHaveBeenCalled();
  });
});
