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
import { ResponseDto } from 'src/modules/shared/dto/response.dto';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
jest.mock('../../application/use-cases/login.use-case', () => ({
  LoginUseCase: jest.fn(),
}));
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LoginController } from './login.controller';
describe('LoginController', () => {
  let execute: jest.MockedFunction<LoginUseCase['execute']>;
  let controller: LoginController;
  let req: Request;
  const dto = { email: 'test@example.com', password: 'password' };
  const access = { accessToken: 'access', refreshToken: 'refresh' };
  beforeEach(() => {
    execute = jest.fn().mockResolvedValue(access);
    controller = new LoginController({ execute } as unknown as LoginUseCase);
    req = { logId: 'log', logData: true } as Request;
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('devuelve los tokens y desactiva el registro de datos sensibles', async () => {
    const result = await controller.login(dto, req);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(dto, 'log');
    expect(result).toBeInstanceOf(ResponseDto);
    expect(result).toEqual({
      statusCode: 200,
      logId: 'log',
      message: 'login successful',
      data: access,
    });
    expect(result.data).toBe(access);
    expect(req.logData).toBe(false);
  });
  it.each([
    { level: ErrorLevel.Validation, status: 400 },
    { level: ErrorLevel.Unknown, status: 500 },
  ])('convierte errores $level en HTTP $status', async ({ level, status }) => {
    execute.mockRejectedValue(new UseCaseError('use case failed', level));
    const error: unknown = await controller
      .login(dto, req)
      .catch((error: unknown) => error);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(status);
    expect((error as HttpException).getResponse()).toEqual({
      statusCode: status,
      logId: 'log',
      message: 'login failed',
      error: 'use case failed',
    });
    expect(req.logData).toBe(true);
  });
  it('oculta el detalle de errores inesperados en la respuesta HTTP', async () => {
    execute.mockRejectedValue(new Error('private database details'));
    const error: unknown = await controller
      .login(dto, req)
      .catch((error: unknown) => error);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(500);
    expect((error as HttpException).getResponse()).toEqual({
      statusCode: 500,
      logId: 'log',
      message: 'login failed',
      error: 'internal server error',
    });
    expect(req.logData).toBe(true);
  });
});
