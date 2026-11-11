jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/session.repository',
  () => ({ SESSION_REPOSITORY: Symbol('SESSION_REPOSITORY') }),
);
import { Logger } from '@nestjs/common';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';
import { DeleteExpiredSessionsUseCase } from './deletedExpiredSessions.use-case';
describe('DeleteExpiredSessionsUseCase', () => {
  let repository: jest.Mocked<
    Pick<ISessionRepository, 'deleteExpiredSessions'>
  >;
  let useCase: DeleteExpiredSessionsUseCase;
  beforeEach(() => {
    repository = { deleteExpiredSessions: jest.fn() };

    useCase = new DeleteExpiredSessionsUseCase(
      repository as unknown as ISessionRepository,
    );
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('delega la operacion con los identificadores correctos', async () => {
    repository.deleteExpiredSessions.mockResolvedValue(undefined);
    await expect(useCase.execute('log')).resolves.toBeUndefined();

    expect(repository.deleteExpiredSessions).toHaveBeenCalledTimes(1);
    expect(repository.deleteExpiredSessions).toHaveBeenCalledWith('log');
  });
  it.each(['deleteExpiredSessions'] as const)(
    'maneja errores de %s',
    async (method) => {
      const error = new Error('database unavailable');
      repository[method].mockRejectedValue(error);
      await expect(useCase.execute('log')).rejects.toBe(error);
    },
  );
});
