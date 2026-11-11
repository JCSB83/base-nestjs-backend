jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/session.repository',
  () => ({ SESSION_REPOSITORY: Symbol('SESSION_REPOSITORY') }),
);
import { Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';
import { RevokeSessionUseCase } from './revokeSession.use-case';
describe('RevokeSessionUseCase', () => {
  let repository: jest.Mocked<
    Pick<ISessionRepository, 'deleteSessionBySessionId'>
  >;
  let useCase: RevokeSessionUseCase;
  beforeEach(() => {
    repository = { deleteSessionBySessionId: jest.fn() };

    useCase = new RevokeSessionUseCase(
      repository as unknown as ISessionRepository,
    );
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('delega la operacion con los identificadores correctos', async () => {
    repository.deleteSessionBySessionId.mockResolvedValue(undefined);
    await expect(useCase.execute('id', 'log')).resolves.toBeUndefined();

    expect(repository.deleteSessionBySessionId).toHaveBeenCalledTimes(1);
    expect(repository.deleteSessionBySessionId).toHaveBeenCalledWith(
      'id',
      'log',
    );
  });
  it.each(['deleteSessionBySessionId'] as const)(
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
  it.each(['deleteSessionBySessionId'] as const)(
    'conserva UseCaseError de %s',
    async (method) => {
      const error = new UseCaseError('validation', ErrorLevel.Validation);
      repository[method].mockRejectedValue(error);
      await expect(useCase.execute('id', 'log')).rejects.toBe(error);
    },
  );
});
