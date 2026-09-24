import { Logger } from '@nestjs/common';

export class UseCaseError extends Error {
  public readonly innerError?: Error;

  constructor(message: string, innerError?: Error, logId?: string) {
    super(message);
    this.name = 'UseCaseError';
    this.innerError = innerError;
    Object.setPrototypeOf(this, UseCaseError.prototype);
    Error.captureStackTrace?.(this, this.constructor);
    Logger.error(
      `[${logId}] UseCaseError: ${message}` +
        (innerError ? ` | InnerError: ${innerError.message}` : ''),
    );
  }
}
