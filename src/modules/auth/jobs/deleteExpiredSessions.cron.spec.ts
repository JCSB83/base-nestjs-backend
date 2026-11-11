jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_MINUTE: '* * * * *' },
}));
jest.mock('../application/use-cases/deletedExpiredSessions.use-case', () => ({
  DeleteExpiredSessionsUseCase: jest.fn(),
}));
import { Logger } from '@nestjs/common';
import { Utils } from 'src/modules/shared/utils/utils';
import { DeleteExpiredSessionsUseCase } from '../application/use-cases/deletedExpiredSessions.use-case';
import { DeleteExpiredSessionsCron } from './deleteExpiredSessions.cron';
describe('DeleteExpiredSessionsCron', () => {
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('ejecuta limpieza con logId generado', async () => {
    jest.spyOn(Utils, 'generateLogId').mockReturnValue('log');
    const execute = jest.fn().mockResolvedValue(undefined);
    await expect(
      new DeleteExpiredSessionsCron({
        execute,
      } as unknown as DeleteExpiredSessionsUseCase).deleteExpiredSessions(),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledWith('log');
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('registra el fallo sin propagarlo al planificador', async () => {
    const error = new Error('database failed');
    const execute = jest.fn().mockRejectedValue(error);
    const log = jest.spyOn(Logger, 'error');
    await expect(
      new DeleteExpiredSessionsCron({
        execute,
      } as unknown as DeleteExpiredSessionsUseCase).deleteExpiredSessions(),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      'Error occurred while deleting expired sessions:',
      error,
    );
  });
});
