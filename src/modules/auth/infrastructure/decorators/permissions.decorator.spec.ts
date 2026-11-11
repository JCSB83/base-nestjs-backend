import 'reflect-metadata';
import { Permissions, PERMISSIONS_KEY } from './permissions.decorator';
import { Reflector } from '@nestjs/core';
describe('Permissions', () => {
  it('publica permisos de clase y permite sobrescribirlos en el handler', () => {
    @Permissions('read')
    class Controller {
      @Permissions('write', 'delete') execute(this: void) {}
      @Permissions() public(this: void) {}
    }
    const reflector = new Reflector();
    expect(reflector.get(PERMISSIONS_KEY, Controller)).toEqual(['read']);
    expect(
      reflector.get(PERMISSIONS_KEY, Controller.prototype.execute),
    ).toEqual(['write', 'delete']);
    expect(reflector.get(PERMISSIONS_KEY, Controller.prototype.public)).toEqual(
      [],
    );
  });
});
