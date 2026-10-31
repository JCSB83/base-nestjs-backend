import { Logger } from '@nestjs/common';

export class RepositoryError extends Error {
  public readonly innerError?: Error;

  constructor(message: string, innerError?: Error, logId?: string) {
    super(message);
    this.name = 'RepositoryError';
    this.innerError = innerError;
    Object.setPrototypeOf(this, RepositoryError.prototype);
    Error.captureStackTrace?.(this, this.constructor);
    Logger.error(
      `[${logId}] RepositoryError: ${message}` +
        (innerError ? ` | InnerError: ${innerError.message}` : ''),
    );
  }
}
