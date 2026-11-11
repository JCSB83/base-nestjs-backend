jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/session.repository',
  () => ({ SESSION_REPOSITORY: Symbol('SESSION_REPOSITORY') }),
);
jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/user.repository',
  () => ({ USER_REPOSITORY: Symbol('USER_REPOSITORY') }),
);
import { Logger } from '@nestjs/common';
import { JwtService, TokenExpiredError, JsonWebTokenError } from '@nestjs/jwt';
import { AuthConfig } from '../../auth.config';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { ValidateTokenUseCase } from './validateToken.use-case';
describe('ValidateTokenUseCase', () => {
  let jwt: { verify: jest.Mock };
  let sessions: jest.Mocked<Pick<ISessionRepository, 'getSessionByJTI'>>;
  let users: jest.Mocked<Pick<IUserRepository, 'getActiveUserByUserId'>>;
  let useCase: ValidateTokenUseCase;
  const session = {
    userId: 'user',
    jti: 'jti',
    expiresAt: new Date('2030-01-01'),
  };
  const user = {
    userId: 'user',
    displayName: 'Test',
    firstName: 'Test',
    email: 'test@example.com',
    phone: '123',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: undefined,
    profileId: 'profile',
    permissions: [],
  };
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jwt = { verify: jest.fn().mockReturnValue({ sub: 'user', jti: 'jti' }) };
    sessions = { getSessionByJTI: jest.fn().mockResolvedValue(session) };
    users = { getActiveUserByUserId: jest.fn().mockResolvedValue(user) };
    useCase = new ValidateTokenUseCase(
      { jwtSecret: 'secret' } as AuthConfig,
      jwt as unknown as JwtService,
      sessions as unknown as ISessionRepository,
      users as unknown as IUserRepository,
    );
  });
  afterEach(() => jest.restoreAllMocks());
  it('valida el token y devuelve usuario y sesion', async () => {
    await expect(useCase.execute('token', 'log')).resolves.toEqual({
      user,
      session,
    });
    expect(jwt.verify).toHaveBeenCalledWith('token', { secret: 'secret' });
    expect(sessions.getSessionByJTI).toHaveBeenCalledWith('jti', 'log');
    expect(users.getActiveUserByUserId).toHaveBeenCalledWith('user', 'log');
  });
  it('devuelve undefined si no existe sesion', async () => {
    sessions.getSessionByJTI.mockResolvedValue(undefined);
    await expect(useCase.execute('token', 'log')).resolves.toBeUndefined();
    expect(users.getActiveUserByUserId).not.toHaveBeenCalled();
  });
  it('devuelve la sesion con usuario undefined si no hay usuario activo', async () => {
    users.getActiveUserByUserId.mockResolvedValue(undefined);
    await expect(useCase.execute('token', 'log')).resolves.toEqual({
      user: undefined,
      session,
    });
  });
  it.each([
    {
      error: new TokenExpiredError('expired', new Date('2026-01-01')),
      message: 'Token expired',
      level: ErrorLevel.Validation,
    },
    {
      error: new JsonWebTokenError('invalid'),
      message: 'Invalid token',
      level: ErrorLevel.Validation,
    },
    {
      error: new Error('unexpected'),
      message: 'Internal server error',
      level: ErrorLevel.Unknown,
    },
  ])(
    'clasifica $message durante la verificacion',
    async ({ error, message, level }) => {
      jwt.verify.mockImplementation(() => {
        throw error;
      });
      await expect(useCase.execute('token', 'log')).rejects.toMatchObject({
        name: 'UseCaseError',
        message,
        level,
        innerError: error,
      });
      expect(sessions.getSessionByJTI).not.toHaveBeenCalled();
      expect(users.getActiveUserByUserId).not.toHaveBeenCalled();
    },
  );
  it.each(['session', 'user'])(
    'envuelve errores del repositorio de %s',
    async (stage) => {
      const error = new Error('database unavailable');
      if (stage === 'session')
        sessions.getSessionByJTI.mockRejectedValue(error);
      else users.getActiveUserByUserId.mockRejectedValue(error);
      await expect(useCase.execute('token', 'log')).rejects.toMatchObject({
        name: 'UseCaseError',
        message: 'Internal server error',
        level: ErrorLevel.Unknown,
        innerError: error,
      });
      if (stage === 'session')
        expect(users.getActiveUserByUserId).not.toHaveBeenCalled();
    },
  );
});
