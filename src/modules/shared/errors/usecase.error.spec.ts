import { Logger } from '@nestjs/common';
import { UseCaseError } from './usecase.error';
import { ErrorLevel } from './errorLevel.enum';
describe('UseCaseError', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('conserva mensaje, causa, prototipo y trazabilidad', () => {
    const cause = new Error('database failed');
    const error = new UseCaseError(
      'operation failed',
      ErrorLevel.Validation,
      cause,
      'log',
    );
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UseCaseError);
    expect(error.name).toBe('UseCaseError');
    expect(error.message).toBe('operation failed');
    expect(error.innerError).toBe(cause);
    expect(error.stack).toContain('UseCaseError: operation failed');
    expect(error.level).toBe(ErrorLevel.Validation);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      '[log] UseCaseError: operation failed | InnerError: database failed',
    );
  });
  it('permite omitir causa y logId', () => {
    const error = new UseCaseError('failed');
    expect(error.innerError).toBeUndefined();
    expect(error.level).toBe(ErrorLevel.Unknown);
    expect(log).toHaveBeenCalledWith('[undefined] UseCaseError: failed');
  });
  it('conserva el nivel Unknown explicito', () => {
    expect(new UseCaseError('failed', ErrorLevel.Unknown).level).toBe(
      ErrorLevel.Unknown,
    );
  });
});
