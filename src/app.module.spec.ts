import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

jest.mock('./app.config.module', () => ({ AppConfigModule: class {} }));
jest.mock('./modules/health/health.module', () => ({ HealthModule: class {} }));
jest.mock('./modules/metrics/metrics.module', () => ({ MetricsModule: class {} }));
jest.mock('./modules/shared/shared.module', () => ({ SharedModule: class {} }));

describe('AppModule', () => {
  afterEach(() => jest.restoreAllMocks());
  it('registra su inicialización', () => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    new AppModule().onModuleInit();
    expect(jest.mocked(Logger).log).toHaveBeenCalledWith(
      'AppModule initialized',
    );
  });
});
