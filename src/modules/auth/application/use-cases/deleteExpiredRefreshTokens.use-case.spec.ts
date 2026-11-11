jest.mock(
  '../../infrastructure/persistence/typeorm/repositories/refreshToken.repository',
  () => ({ REFRESHTOKEN_REPOSITORY: Symbol('REFRESHTOKEN_REPOSITORY') }),
);
import { Logger } from '@nestjs/common';
import type { IRefreshTokenRepository } from '../../domain/repositories/refreshToken.repository.interface';
import { DeleteExpiredRefreshTokensUseCase } from './deleteExpiredRefreshTokens.use-case';
describe('DeleteExpiredRefreshTokensUseCase', () => {
  let repository: jest.Mocked<
    Pick<IRefreshTokenRepository, 'deleteExpiredRefreshTokens'>
  >;
  let useCase: DeleteExpiredRefreshTokensUseCase;
  beforeEach(() => {
    repository = { deleteExpiredRefreshTokens: jest.fn() };

    useCase = new DeleteExpiredRefreshTokensUseCase(
      repository as unknown as IRefreshTokenRepository,
    );
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('delega la operacion con los identificadores correctos', async () => {
    repository.deleteExpiredRefreshTokens.mockResolvedValue(undefined);
    await expect(useCase.execute('log')).resolves.toBeUndefined();

    expect(repository.deleteExpiredRefreshTokens).toHaveBeenCalledTimes(1);
    expect(repository.deleteExpiredRefreshTokens).toHaveBeenCalledWith('log');
  });
  it.each(['deleteExpiredRefreshTokens'] as const)(
    'maneja errores de %s',
    async (method) => {
      const error = new Error('database unavailable');
      repository[method].mockRejectedValue(error);
      await expect(useCase.execute('log')).rejects.toBe(error);
    },
  );
});
