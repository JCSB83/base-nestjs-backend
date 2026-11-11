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
jest.mock('../../infrastructure/guards/jwt.authguard', () => ({
  JwtAuthGuard: jest.fn(),
}));
jest.mock('../../application/use-cases/getSessions.use-case', () => ({
  GetSessionsUseCase: jest.fn(),
}));
import { GetSessionsUseCase } from '../../application/use-cases/getSessions.use-case';
jest.mock('../../application/use-cases/revokeSession.use-case', () => ({
  RevokeSessionUseCase: jest.fn(),
}));
import { RevokeSessionUseCase } from '../../application/use-cases/revokeSession.use-case';
import { SessionController } from './session.controller';
describe('SessionController', () => {
  let getSessions: jest.MockedFunction<GetSessionsUseCase['execute']>;
  let revokeSession: jest.MockedFunction<RevokeSessionUseCase['execute']>;
  let controller: SessionController;
  let req: Request;
  beforeEach(() => {
    getSessions = jest.fn();
    revokeSession = jest.fn().mockResolvedValue(undefined);
    controller = new SessionController(
      { execute: getSessions } as unknown as GetSessionsUseCase,
      { execute: revokeSession } as unknown as RevokeSessionUseCase,
    );
    req = {
      userId: 'user',
      sessionId: 'current-session',
      logId: 'log',
      logData: true,
    } as Request;
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    { sessions: [] },
    {
      sessions: [
        {
          sessionId: 'session-1',
          userId: 'user',
          jti: 'jti-1',
          expiresAt: new Date('2030-01-01'),
        },
        {
          sessionId: 'session-2',
          userId: 'user',
          jti: 'jti-2',
          expiresAt: new Date('2030-01-02'),
        },
      ],
    },
  ])('devuelve las sesiones y su cantidad: %j', async ({ sessions }) => {
    getSessions.mockResolvedValue(sessions);
    const result = await controller.getSessions(req);
    expect(getSessions).toHaveBeenCalledTimes(1);
    expect(getSessions).toHaveBeenCalledWith('user', 'log');
    expect(result).toBeInstanceOf(ResponseDto);
    expect(result).toEqual({
      statusCode: 200,
      logId: 'log',
      message: sessions.length + ' sessions found',
      data: sessions,
    });
    expect(result.data).toBe(sessions);
    expect(req.logData).toBe(false);
    expect(revokeSession).not.toHaveBeenCalled();
  });
  it('revoca la sesion indicada por parametro', async () => {
    await expect(
      controller.revokeSession('target-session', req),
    ).resolves.toBeUndefined();
    expect(revokeSession).toHaveBeenCalledTimes(1);
    expect(revokeSession).toHaveBeenCalledWith('target-session', 'log');
    expect(getSessions).not.toHaveBeenCalled();
  });
  describe.each(['getSessions', 'revokeSession'] as const)('%s', (method) => {
    it.each(['unexpected', 'validation'])(
      'convierte el error %s en HTTP 500',
      async (kind) => {
        const error =
          kind === 'validation'
            ? new UseCaseError('private details', ErrorLevel.Validation)
            : new Error('private details');
        const operation =
          method === 'getSessions' ? getSessions : revokeSession;
        operation.mockRejectedValue(error);
        const promise =
          method === 'getSessions'
            ? controller.getSessions(req)
            : controller.revokeSession('target-session', req);
        const result: unknown = await promise.catch((error: unknown) => error);
        expect(result).toBeInstanceOf(HttpException);
        expect((result as HttpException).getStatus()).toBe(500);
        expect((result as HttpException).getResponse()).toEqual({
          statusCode: 500,
          logId: 'log',
          error: 'INTERNAL_SERVER_ERROR',
        });
        expect(req.logData).toBe(true);
      },
    );
  });
});
