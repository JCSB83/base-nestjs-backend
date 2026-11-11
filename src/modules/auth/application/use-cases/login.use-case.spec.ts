jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/session.repository',
  () => ({ SESSION_REPOSITORY: Symbol('SESSION_REPOSITORY') }),
);
jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/user.repository',
  () => ({ USER_REPOSITORY: Symbol('USER_REPOSITORY') }),
);
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthConfig } from '../../auth.config';
import { Utils } from '../../infrastructure/utils/utils';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';

import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { AccessDto } from '../../presentation/dto/access.dto';
import { LoginUseCase } from './login.use-case';
describe('LoginUseCase', () => {
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

  let useCase: LoginUseCase;
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

    useCase = new LoginUseCase(
      config,
      jwt as unknown as JwtService,
      users,
      sessions as unknown as ISessionRepository,
    );
  });
  afterEach(() => jest.restoreAllMocks());
  it('emite y persiste ambos tokens con sus expiraciones', async () => {
    const result = await useCase.execute(
      { email: 'test@example.com', password: 'password' },
      'log',
    );
    expect(result).toBeInstanceOf(AccessDto);
    expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    // Mock assertions inspect the function without invoking it.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(users.getUserByEmailAndPassword).toHaveBeenCalledWith(
      'test@example.com',
      'password',
      'log',
    );

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
      undefined,
      {
        sessionId: undefined,
        userId: 'user',
        jti: 'new-jti',
        expiresAt: new Date(1800000000000),
      },
      { userId: 'user', jti: 'new-jti', expiresAt: new Date(1800003600000) },
      'log',
    );
  });
  it.each([
    { value: undefined, message: 'User not found' },
    { value: { ...user, isActive: false }, message: 'User is not active' },
  ])('rechaza: $message', async ({ value, message }) => {
    users.getUserByEmailAndPassword.mockResolvedValue(value);
    await expect(
      useCase.execute(
        { email: 'test@example.com', password: 'password' },
        'log',
      ),
    ).rejects.toMatchObject({
      name: 'UseCaseError',
      message,
      level: ErrorLevel.Validation,
    });
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(sessions.saveSessionAndRefreshToken).not.toHaveBeenCalled();
  });

  it.each(['user', 'sign', 'decode', 'save'])(
    'envuelve errores inesperados de %s',
    async (stage) => {
      const error = new Error('dependency failed');
      if (stage === 'user')
        users.getUserByEmailAndPassword.mockRejectedValue(error);
      if (stage === 'save')
        sessions.saveSessionAndRefreshToken.mockRejectedValue(error);
      if (stage === 'sign' || stage === 'decode' || stage === 'verify')
        jwt[stage].mockReset().mockImplementation(() => {
          throw error;
        });

      await expect(
        useCase.execute(
          { email: 'test@example.com', password: 'password' },
          'log',
        ),
      ).rejects.toMatchObject({
        name: 'UseCaseError',
        message: 'Internal server error',
        level: ErrorLevel.Unknown,
        innerError: error,
      });
      if (stage !== 'save')
        expect(sessions.saveSessionAndRefreshToken).not.toHaveBeenCalled();
    },
  );
  it('conserva UseCaseError de las dependencias', async () => {
    const error = new UseCaseError('validation', ErrorLevel.Validation);
    users.getUserByEmailAndPassword.mockRejectedValue(error);
    await expect(
      useCase.execute(
        { email: 'test@example.com', password: 'password' },
        'log',
      ),
    ).rejects.toBe(error);
  });
});
