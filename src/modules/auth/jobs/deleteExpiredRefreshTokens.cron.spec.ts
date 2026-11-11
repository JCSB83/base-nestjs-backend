jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_MINUTE: '* * * * *' },
}));
jest.mock(
  '../application/use-cases/deleteExpiredRefreshTokens.use-case',
  () => ({ DeleteExpiredRefreshTokensUseCase: jest.fn() }),
);
import { Logger } from '@nestjs/common';
import { Utils } from 'src/modules/shared/utils/utils';
import { DeleteExpiredRefreshTokensUseCase } from '../application/use-cases/deleteExpiredRefreshTokens.use-case';
import { DeleteExpiredRefreshTokensCron } from './deleteExpiredRefreshTokens.cron';
describe('DeleteExpiredRefreshTokensCron', () => {
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('ejecuta limpieza con logId generado', async () => {
    jest.spyOn(Utils, 'generateLogId').mockReturnValue('log');
    const execute = jest.fn().mockResolvedValue(undefined);
    await expect(
      new DeleteExpiredRefreshTokensCron({
        execute,
      } as unknown as DeleteExpiredRefreshTokensUseCase).deletedExpiredRefreshTokens(),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledWith('log');
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('registra el fallo sin propagarlo al planificador', async () => {
    const error = new Error('database failed');
    const execute = jest.fn().mockRejectedValue(error);
    const log = jest.spyOn(Logger, 'error');
    await expect(
      new DeleteExpiredRefreshTokensCron({
        execute,
      } as unknown as DeleteExpiredRefreshTokensUseCase).deletedExpiredRefreshTokens(),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      'Error occurred while deleting expired refresh tokens:',
      error,
    );
  });
});
