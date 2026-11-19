import { Logger } from '@nestjs/common';
import { HealthModule } from './health.module';

jest.mock('@nestjs/terminus', () => ({ TerminusModule: class {} }));
jest.mock('./health.controller', () => ({ HealthController: class {} }));

describe('HealthModule', () => {
  afterEach(() => jest.restoreAllMocks());
  it('registra su inicialización', () => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    new HealthModule().onModuleInit();
    expect(jest.mocked(Logger).log).toHaveBeenCalledWith(
      'HealthModule initialized',
    );
  });
});
