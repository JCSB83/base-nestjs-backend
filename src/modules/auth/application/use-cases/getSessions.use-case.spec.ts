jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/session.repository',
  () => ({ SESSION_REPOSITORY: Symbol('SESSION_REPOSITORY') }),
);
import { Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';
import { GetSessionsUseCase } from './getSessions.use-case';
describe('GetSessionsUseCase', () => {
  let repository: jest.Mocked<Pick<ISessionRepository, 'getSessionsByUserId'>>;
  let useCase: GetSessionsUseCase;
  beforeEach(() => {
    repository = { getSessionsByUserId: jest.fn() };

    useCase = new GetSessionsUseCase(
      repository as unknown as ISessionRepository,
    );
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it.each([
    { sessions: [] },
    {
      sessions: [
        { userId: 'user', jti: 'jti', expiresAt: new Date('2030-01-01') },
      ],
    },
  ])('devuelve las sesiones: %j', async ({ sessions }) => {
    repository.getSessionsByUserId.mockResolvedValue(sessions);
    await expect(useCase.execute('id', 'log')).resolves.toBe(sessions);
    expect(repository.getSessionsByUserId).toHaveBeenCalledWith('id', 'log');
  });
  it.each(['getSessionsByUserId'] as const)(
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
    },
  );
  it.each(['getSessionsByUserId'] as const)(
    'conserva UseCaseError de %s',
    async (method) => {
      const error = new UseCaseError('validation', ErrorLevel.Validation);
      repository[method].mockRejectedValue(error);
      await expect(useCase.execute('id', 'log')).rejects.toBe(error);
    },
  );
});
