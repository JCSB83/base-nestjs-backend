import { Logger } from '@nestjs/common';
import { RepositoryError } from './repository.error';

describe('RepositoryError', () => {
  beforeEach(() =>
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined),
  );
  afterEach(() => jest.restoreAllMocks());

  it('preserva identidad, causa y contexto del error', () => {
    const inner = new Error('database unavailable');
    const error = new RepositoryError('operation failed', inner, '123');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RepositoryError);
    expect(error.name).toBe('RepositoryError');
    expect(error.message).toBe('operation failed');
    expect(error.innerError).toBe(inner);
    expect(error.stack).toContain('operation failed');

    expect(jest.mocked(Logger).error).toHaveBeenCalledWith(
      '[123] RepositoryError: operation failed | InnerError: database unavailable',
    );
  });

  it('admite ausencia de causa y contexto', () => {
    const error = new RepositoryError('failure');
    expect(error.innerError).toBeUndefined();

    expect(jest.mocked(Logger).error).toHaveBeenCalledWith(
      '[undefined] RepositoryError: failure',
    );
  });
});
