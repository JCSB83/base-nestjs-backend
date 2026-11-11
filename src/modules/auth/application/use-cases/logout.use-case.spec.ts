jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/session.repository',
  () => ({ SESSION_REPOSITORY: Symbol('SESSION_REPOSITORY') }),
);
import { Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';
import { LogoutUseCase } from './logout.use-case';
describe('LogoutUseCase', () => {
  let repository: jest.Mocked<
    Pick<ISessionRepository, 'deleteSessionAndRefreshToken' | 'getSessionById'>
  >;
  let useCase: LogoutUseCase;
  beforeEach(() => {
    repository = {
      deleteSessionAndRefreshToken: jest.fn(),
      getSessionById: jest.fn(),
    };
    repository.getSessionById.mockResolvedValue({
      sessionId: 'id',
      userId: 'user',
      jti: 'jti',
      expiresAt: new Date('2030-01-01'),
    });
    useCase = new LogoutUseCase(repository as unknown as ISessionRepository);
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('delega la operacion con los identificadores correctos', async () => {
    repository.deleteSessionAndRefreshToken.mockResolvedValue(undefined);
    await expect(useCase.execute('id', 'log')).resolves.toBeUndefined();
    expect(repository.getSessionById).toHaveBeenCalledWith('id', 'log');
    expect(repository.deleteSessionAndRefreshToken).toHaveBeenCalledTimes(1);
    expect(repository.deleteSessionAndRefreshToken).toHaveBeenCalledWith(
      'jti',
      'log',
    );
  });
  it('rechaza una sesion inexistente sin eliminar tokens', async () => {
    repository.getSessionById.mockResolvedValue(undefined);
    await expect(useCase.execute('id', 'log')).rejects.toMatchObject({
      message: 'Session not found',
      level: ErrorLevel.Validation,
    });
    expect(repository.deleteSessionAndRefreshToken).not.toHaveBeenCalled();
  });
  it.each(['deleteSessionAndRefreshToken', 'getSessionById'] as const)(
    'maneja errores de %s',
    async (method) => {
      const error = new Error('database unavailable');
      repository[method].mockRejectedValue(error);
      await expect(useCase.execute('id', 'log')).rejects.toMatchObject({
        name: 'UseCaseError',
        message: 'Internal server error',
        level: ErrorLevel.Unknown,
        innerError: error,
      });
      if (method === 'getSessionById')
        expect(repository.deleteSessionAndRefreshToken).not.toHaveBeenCalled();
    },
  );
  it.each(['deleteSessionAndRefreshToken', 'getSessionById'] as const)(
    'conserva UseCaseError de %s',
    async (method) => {
      const error = new UseCaseError('validation', ErrorLevel.Validation);
      repository[method].mockRejectedValue(error);
      await expect(useCase.execute('id', 'log')).rejects.toBe(error);
    },
  );
});
