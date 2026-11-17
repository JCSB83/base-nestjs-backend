import { Logger, RequestMethod } from '@nestjs/common';
import { MetricsModule } from './metrics.module';
import { MetricsMiddleware } from './metrics.middleware';

jest.mock('@/app.config', () => ({ AppConfig: class {} }));
jest.mock('./metrics.controller', () => ({ MetricsController: class {} }));

describe('MetricsModule', () => {
  afterEach(() => jest.restoreAllMocks());

  it('aplica el middleware a todas las rutas excepto GET metrics', () => {
    const forRoutes = jest.fn();
    const exclude = jest.fn().mockReturnValue({ forRoutes });
    const apply = jest.fn().mockReturnValue({ exclude });
    new MetricsModule().configure({ apply });
    expect(apply).toHaveBeenCalledWith(MetricsMiddleware);
    expect(exclude).toHaveBeenCalledWith({
      path: 'metrics',
      method: RequestMethod.GET,
    });
    expect(forRoutes).toHaveBeenCalledWith('*');
  });

  it('registra su inicialización', () => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    new MetricsModule().onModuleInit();
    expect(jest.mocked(Logger).log).toHaveBeenCalledWith(
      'MetricsModule initialized',
    );
  });
});
