jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => () => undefined,
  ApiOperation: () => () => undefined,
  ApiInternalServerErrorResponse: () => () => undefined,
  ApiBearerAuth: () => () => undefined,
  ApiUnauthorizedResponse: () => () => undefined,
  ApiBody: () => () => undefined,
  ApiBadRequestResponse: () => () => undefined,
  ApiParam: () => () => undefined,
  ApiOkResponse: () => () => undefined,
  ApiNoContentResponse: () => () => undefined,
}));
import { HttpException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
jest.mock('../../infrastructure/guards/jwt.authguard', () => ({
  JwtAuthGuard: jest.fn(),
}));
jest.mock('../../application/use-cases/logout.use-case', () => ({
  LogoutUseCase: jest.fn(),
}));
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
jest.mock('../../application/use-cases/logoutAll.use-case', () => ({
  LogoutAllUseCase: jest.fn(),
}));
import { LogoutAllUseCase } from '../../application/use-cases/logoutAll.use-case';
import { LogoutController } from './logout.controller';
describe('LogoutController', () => {
  let logout: jest.MockedFunction<LogoutUseCase['execute']>;
  let logoutAll: jest.MockedFunction<LogoutAllUseCase['execute']>;
  let controller: LogoutController;
  let req: Request;
  beforeEach(() => {
    logout = jest.fn().mockResolvedValue(undefined);
    logoutAll = jest.fn().mockResolvedValue(undefined);
    controller = new LogoutController(
      { execute: logout } as unknown as LogoutUseCase,
      { execute: logoutAll } as unknown as LogoutAllUseCase,
    );
    req = { sessionId: 'current-session', logId: 'log' } as Request;
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['logout', 'logoutAll'] as const)(
    '%s delega solo al caso de uso correspondiente',
    async (method) => {
      await expect(controller[method](req)).resolves.toBeUndefined();
      const execute = method === 'logout' ? logout : logoutAll;
      const other = method === 'logout' ? logoutAll : logout;
      expect(execute).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledWith('current-session', 'log');
      expect(other).not.toHaveBeenCalled();
    },
  );
  describe.each(['logout', 'logoutAll'] as const)('%s', (method) => {
    it.each(['unexpected', 'validation'])(
      'convierte el error %s en HTTP 500 sin exponer detalles',
      async (kind) => {
        const error =
          kind === 'validation'
            ? new UseCaseError('private details', ErrorLevel.Validation)
            : new Error('private details');
        (method === 'logout' ? logout : logoutAll).mockRejectedValue(error);
        const result: unknown = await controller[method](req).catch(
          (error: unknown) => error,
        );
        expect(result).toBeInstanceOf(HttpException);
        expect((result as HttpException).getStatus()).toBe(500);
        expect((result as HttpException).getResponse()).toEqual({
          statusCode: 500,
          logId: 'log',
          error: 'INTERNAL_SERVER_ERROR',
        });
      },
    );
  });
});
