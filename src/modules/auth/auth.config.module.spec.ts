import 'reflect-metadata';
import { AuthConfigModule } from './auth.config.module';
import { AuthConfig } from './auth.config';
describe('AuthConfigModule', () => {
  it('provee y exporta la configuracion de Auth', () => {
    expect(Reflect.getMetadata('providers', AuthConfigModule)).toEqual([
      AuthConfig,
    ]);
    expect(Reflect.getMetadata('exports', AuthConfigModule)).toEqual([
      AuthConfig,
    ]);
  });
});
