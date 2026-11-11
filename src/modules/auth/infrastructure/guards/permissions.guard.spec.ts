import { ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
describe('PermissionsGuard', () => {
  let getAllAndOverride: jest.Mock;
  let guard: PermissionsGuard;
  let request: { logId: string; user?: { permissions?: string[] | null } };
  let context: ExecutionContext;
  const handler = () => undefined;
  class Controller {}
  beforeEach(() => {
    getAllAndOverride = jest.fn();
    guard = new PermissionsGuard({ getAllAndOverride } as unknown as Reflector);
    request = { logId: 'log', user: { permissions: ['read', 'write'] } };
    context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
      getClass: () => Controller,
    } as unknown as ExecutionContext;
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it.each([undefined, []])(
    'permite endpoints sin permisos requeridos: %j',
    async (value: unknown) => {
      getAllAndOverride.mockReturnValue(value);
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
        handler,
        Controller,
      ]);
    },
  );
  it('requiere todos los permisos, no solamente uno', async () => {
    getAllAndOverride.mockReturnValue(['read', 'write']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    request.user = { permissions: ['read'] };
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 403,
      response: {
        statusCode: 403,
        logId: 'log',
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this operation',
      },
    });
  });
  it('deniega si falta usuario', async () => {
    getAllAndOverride.mockReturnValue(['read']);
    delete request.user;
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });
  it.each([undefined, null, []])(
    'deniega permisos ausentes: %j',
    async (permissions) => {
      getAllAndOverride.mockReturnValue(['read']);
      request.user = { permissions };
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: 403,
      });
    },
  );
});
