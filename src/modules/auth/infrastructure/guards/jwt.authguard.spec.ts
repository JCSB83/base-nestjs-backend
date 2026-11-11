jest.mock('../../application/use-cases/validateToken.use-case', () => ({
  ValidateTokenUseCase: jest.fn(),
}));
import {
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ValidateTokenUseCase } from '../../application/use-cases/validateToken.use-case';
import { Utils } from 'src/modules/shared/utils/utils';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { JwtAuthGuard } from './jwt.authguard';
describe('JwtAuthGuard', () => {
  let execute: jest.Mock;
  let guard: JwtAuthGuard;
  let request: Record<string, unknown> & {
    headers: { authorization?: string };
  };
  let context: ExecutionContext;
  beforeEach(() => {
    execute = jest.fn();
    guard = new JwtAuthGuard({ execute } as unknown as ValidateTokenUseCase);
    request = { headers: { authorization: 'Bearer token' } };
    context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    jest.spyOn(Utils, 'generateLogId').mockReturnValue('log');
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('adjunta usuario, sesion e identificador de trazabilidad', async () => {
    const user = { userId: 'user' };
    execute.mockResolvedValue({ user, session: { sessionId: 'session' } });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(execute).toHaveBeenCalledWith('token', 'log');
    expect(request).toMatchObject({
      user,
      userId: 'user',
      sessionId: 'session',
      logId: 'log',
    });
  });
  it.each([
    { header: undefined, message: 'Authorization header is missing' },
    { header: 'Basic token', message: 'Invalid authorization header format' },
    { header: 'Bearer ', message: 'Token is missing' },
  ])(
    'rechaza $message sin consultar el caso de uso',
    async ({ header, message }) => {
      request.headers.authorization = header;
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: 401,
        message,
      });
      expect(execute).not.toHaveBeenCalled();
    },
  );
  it.each([undefined, { session: { sessionId: 'session' } }])(
    'rechaza validacion sin usuario: %j',
    async (value: unknown) => {
      execute.mockResolvedValue(value);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: 401,
        response: {
          message: 'Invalid or inactive user',
          logId: 'log',
          error: 'UNAUTHORIZED',
        },
      });
      expect(request).not.toHaveProperty('userId');
    },
  );
  it.each(['usecase', 'unauthorized', 'unexpected'])(
    'traduce error %s sin autenticar la solicitud',
    async (kind) => {
      const error =
        kind === 'usecase'
          ? new UseCaseError('expired', ErrorLevel.Validation)
          : kind === 'unauthorized'
            ? new UnauthorizedException('denied')
            : new Error('private');
      execute.mockRejectedValue(error);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: kind === 'unexpected' ? 500 : 401,
        response:
          kind === 'unexpected'
            ? { statusCode: 500, logId: 'log', error: 'INTERNAL_SERVER_ERROR' }
            : {
                statusCode: 401,
                logId: 'log',
                error: 'UNAUTHORIZED',
                message: error.message,
              },
      });
      expect(request).not.toHaveProperty('userId');
    },
  );
});
