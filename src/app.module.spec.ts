jest.mock('./app.config.module', () => ({
  AppConfigModule: class AppConfigModuleMock {},
}));
jest.mock('./modules/shared/shared.module', () => ({
  SharedModule: class SharedModuleMock {},
}));
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigModule } from './app.config.module';
import { SharedModule } from './modules/shared/shared.module';

describe('AppModule', () => {
  afterEach(() => jest.restoreAllMocks());
  it('compone los modulos de configuracion y servicios compartidos', () => {
    expect(Reflect.getMetadata('imports', AppModule)).toEqual([
      AppConfigModule,
      SharedModule,
    ]);
  });
  it('registra su inicializacion', () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation();
    new AppModule().onModuleInit();
    expect(log).toHaveBeenCalledWith('AppModule initialized');
  });
});
