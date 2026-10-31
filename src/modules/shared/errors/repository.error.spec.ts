import { Logger } from '@nestjs/common';
import { RepositoryError } from './repository.error';
describe('RepositoryError', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('conserva mensaje, causa, prototipo y trazabilidad', () => {
    const cause = new Error('database failed');
    const error = new RepositoryError('operation failed', cause, 'log');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RepositoryError);
    expect(error.name).toBe('RepositoryError');
    expect(error.message).toBe('operation failed');
    expect(error.innerError).toBe(cause);
    expect(error.stack).toContain('RepositoryError: operation failed');
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      '[log] RepositoryError: operation failed | InnerError: database failed',
    );
  });
  it('permite omitir causa y logId', () => {
    const error = new RepositoryError('failed');
    expect(error.innerError).toBeUndefined();
    expect(log).toHaveBeenCalledWith('[undefined] RepositoryError: failed');
  });
});
