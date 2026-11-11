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
import { Logger } from '@nestjs/common';
import type { Request } from 'express';
import { ResponseDto } from 'src/modules/shared/dto/response.dto';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
jest.mock('../../infrastructure/guards/jwt.authguard', () => ({
  JwtAuthGuard: jest.fn(),
}));
jest.mock('../../application/use-cases/getUser.use-case', () => ({
  GetUsertUseCase: jest.fn(),
}));
import { GetUsertUseCase } from '../../application/use-cases/getUser.use-case';
import { MeController } from './me.controller';
describe('MeController', () => {
  let execute: jest.MockedFunction<GetUsertUseCase['execute']>;
  let controller: MeController;
  let req: Request;
  const user = {
    userId: 'user',
    displayName: 'Test User',
    firstName: 'Test',
    email: 'test@example.com',
    phone: '123',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: undefined,
    profileId: 'profile',
    permissions: ['read'],
  };
  beforeEach(() => {
    execute = jest.fn().mockReturnValue(user);
    controller = new MeController({ execute });
    req = {
      user: { ...user },
      logId: 'log',
      logData: true,
    } as unknown as Request;
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('devuelve el usuario transformado y desactiva el registro de datos', async () => {
    const result = await controller.getMe(req);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(req.user);
    expect(result).toBeInstanceOf(ResponseDto);
    expect(result).toEqual({
      statusCode: 200,
      logId: 'log',
      message: 'Info found',
      data: user,
    });
    expect(result.data).toBe(user);
    expect(req.logData).toBe(false);
  });
  it('admite que el caso de uso no devuelva usuario', async () => {
    execute.mockReturnValue(undefined);
    await expect(controller.getMe(req)).resolves.toEqual({
      statusCode: 200,
      logId: 'log',
      message: 'Info found',
      data: undefined,
    });
    expect(req.logData).toBe(false);
  });
  it.each(['unexpected', 'validation'])(
    'propaga el error %s del caso de uso ejecutado fuera del try',
    async (kind) => {
      const error =
        kind === 'validation'
          ? new UseCaseError('validation', ErrorLevel.Validation)
          : new Error('failed');
      execute.mockImplementation(() => {
        throw error;
      });
      await expect(controller.getMe(req)).rejects.toBe(error);
      expect(req.logData).toBe(true);
    },
  );
});
