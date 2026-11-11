jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/session.repository',
  () => ({ SESSION_REPOSITORY: Symbol('SESSION_REPOSITORY') }),
);
jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/user.repository',
  () => ({ USER_REPOSITORY: Symbol('USER_REPOSITORY') }),
);
jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/refreshToken.repository',
  () => ({ REFRESHTOKEN_REPOSITORY: Symbol('REFRESHTOKEN_REPOSITORY') }),
);
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthConfig } from '../../auth.config';
import { Utils } from '../../infrastructure/utils/utils';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';
import type { IRefreshTokenRepository } from '../../domain/repositories/refreshToken.repository.interface';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { AccessDto } from '../../presentation/dto/access.dto';
import { RefreshTokenUseCase } from './refreshToken.use-case';
describe('RefreshTokenUseCase', () => {
  const config = {
    jwtSecret: 'access-secret',
    jwtExpiresIn: 600,
    jwtRefreshSecret: 'refresh-secret',
    jwtRefreshExpiresIn: 3600,
  } as AuthConfig;
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
    permissions: [],
  };
  let jwt: { sign: jest.Mock; decode: jest.Mock; verify: jest.Mock };
  let users: jest.Mocked<IUserRepository>;
  let sessions: jest.Mocked<
    Pick<ISessionRepository, 'saveSessionAndRefreshToken'>
  >;
  let tokens: jest.Mocked<IRefreshTokenRepository>;
  let useCase: RefreshTokenUseCase;
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(Utils, 'generateJti').mockReturnValue('new-jti');
    jwt = {
      sign: jest
        .fn()
        .mockReturnValueOnce('access')
        .mockReturnValueOnce('refresh'),
      decode: jest.fn((token: string) =>
        token === 'old-refresh'
          ? { jti: 'old-jti' }
          : { exp: token === 'access' ? 1800000000 : 1800003600 },
      ),
      verify: jest.fn(),
    };
    users = {
      getUserByUserId: jest.fn().mockResolvedValue(user),
      getUserByEmailAndPassword: jest.fn().mockResolvedValue(user),
      getActiveUserByUserId: jest.fn(),
    };
    sessions = {
      saveSessionAndRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    tokens = {
      getRefreshTokenByJTI: jest.fn().mockResolvedValue({
        userId: 'user',
        jti: 'old-jti',
        expiresAt: new Date('2030-01-01'),
      }),
      deleteExpiredRefreshTokens: jest.fn(),
    };
    useCase = new RefreshTokenUseCase(
      config,
      jwt as unknown as JwtService,
      tokens,
      users,
      sessions as unknown as ISessionRepository,
    );
  });
  afterEach(() => jest.restoreAllMocks());
  it('emite y persiste ambos tokens con sus expiraciones', async () => {
    const result = await useCase.execute('old-refresh', 'log');
    expect(result).toBeInstanceOf(AccessDto);
    expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    // Mock assertions inspect the function without invoking it.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(users.getUserByUserId).toHaveBeenCalledWith('user', 'log');
    expect(jwt.verify).toHaveBeenCalledWith('old-refresh', {
      secret: 'refresh-secret',
    });
    // Mock assertions inspect the function without invoking it.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(tokens.getRefreshTokenByJTI).toHaveBeenCalledWith('old-jti', 'log');
    // Mock assertions inspect the function without invoking it.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Utils.generateJti).toHaveBeenCalledTimes(1);
    expect(jwt.sign).toHaveBeenCalledTimes(2);
    expect(jwt.sign).toHaveBeenNthCalledWith(
      1,
      { displayName: 'Test User', sub: 'user', jti: 'new-jti' },
      { secret: 'access-secret', expiresIn: 600 },
    );
    expect(jwt.sign).toHaveBeenNthCalledWith(
      2,
      { displayName: 'Test User', sub: 'user', jti: 'new-jti' },
      { secret: 'refresh-secret', expiresIn: 3600 },
    );
    expect(sessions.saveSessionAndRefreshToken).toHaveBeenCalledTimes(1);
    expect(sessions.saveSessionAndRefreshToken).toHaveBeenCalledWith(
      'old-jti',
      { userId: 'user', jti: 'new-jti', expiresAt: new Date(1800000000000) },
      { userId: 'user', jti: 'new-jti', expiresAt: new Date(1800003600000) },
      'log',
    );
  });
  it.each([
    { value: undefined, message: 'User not found' },
    { value: { ...user, isActive: false }, message: 'User is not active' },
  ])('rechaza: $message', async ({ value, message }) => {
    users.getUserByUserId.mockResolvedValue(value);
    await expect(useCase.execute('old-refresh', 'log')).rejects.toMatchObject({
      name: 'UseCaseError',
      message,
      level: ErrorLevel.Validation,
    });
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(sessions.saveSessionAndRefreshToken).not.toHaveBeenCalled();
  });
  it('rechaza un refresh token inexistente', async () => {
    tokens.getRefreshTokenByJTI.mockResolvedValue(undefined);
    await expect(useCase.execute('old-refresh', 'log')).rejects.toMatchObject({
      message: 'Refresh token not found',
      level: ErrorLevel.Validation,
    });
    // Mock assertions inspect the function without invoking it.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(users.getUserByUserId).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(sessions.saveSessionAndRefreshToken).not.toHaveBeenCalled();
  });
  it.each(['user', 'sign', 'decode', 'save', 'verify', 'token'])(
    'envuelve errores inesperados de %s',
    async (stage) => {
      const error = new Error('dependency failed');
      if (stage === 'user') users.getUserByUserId.mockRejectedValue(error);
      if (stage === 'save')
        sessions.saveSessionAndRefreshToken.mockRejectedValue(error);
      if (stage === 'sign' || stage === 'decode' || stage === 'verify')
        jwt[stage].mockReset().mockImplementation(() => {
          throw error;
        });
      if (stage === 'token')
        tokens.getRefreshTokenByJTI.mockRejectedValue(error);
      await expect(useCase.execute('old-refresh', 'log')).rejects.toMatchObject(
        {
          name: 'UseCaseError',
          message: 'Internal server error',
          level: ErrorLevel.Unknown,
          innerError: error,
        },
      );
      if (stage !== 'save')
        expect(sessions.saveSessionAndRefreshToken).not.toHaveBeenCalled();
    },
  );
  it('conserva UseCaseError de las dependencias', async () => {
    const error = new UseCaseError('validation', ErrorLevel.Validation);
    users.getUserByUserId.mockRejectedValue(error);
    await expect(useCase.execute('old-refresh', 'log')).rejects.toBe(error);
  });
});
