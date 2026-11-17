import { Logger } from '@nestjs/common';
import { UseCaseError } from './usecase.error';
import { ErrorLevel } from './errorLevel.enum';

describe('UseCaseError', () => {
  beforeEach(() =>
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined),
  );
  afterEach(() => jest.restoreAllMocks());

  it('preserva identidad, causa y contexto del error', () => {
    const inner = new Error('database unavailable');
    const error = new UseCaseError(
      'operation failed',
      ErrorLevel.Validation,
      inner,
      '123',
    );
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UseCaseError);
    expect(error.name).toBe('UseCaseError');
    expect(error.message).toBe('operation failed');
    expect(error.innerError).toBe(inner);
    expect(error.stack).toContain('operation failed');
    expect(error.level).toBe(ErrorLevel.Validation);
    expect(jest.mocked(Logger).error).toHaveBeenCalledWith(
      '[123] UseCaseError: operation failed | InnerError: database unavailable',
    );
  });

  it('admite ausencia de causa y contexto', () => {
    const error = new UseCaseError('failure');
    expect(error.innerError).toBeUndefined();
    expect(error.level).toBe(ErrorLevel.Unknown);
    expect(jest.mocked(Logger).error).toHaveBeenCalledWith(
      '[undefined] UseCaseError: failure',
    );
  });
});
