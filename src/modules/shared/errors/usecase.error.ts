import { Logger } from '@nestjs/common';
import { ErrorLevel } from './errorLevel.enum';

export class UseCaseError extends Error {
  public readonly innerError?: Error;
  public readonly level: ErrorLevel;

  constructor(message: string, level?: ErrorLevel, innerError?: Error, logId?: string) {
    super(message);
    this.name = 'UseCaseError';
    this.innerError = innerError;
    this.level = level || ErrorLevel.Unknown;
    Object.setPrototypeOf(this, UseCaseError.prototype);
    Error.captureStackTrace?.(this, this.constructor);
    Logger.error(
      `[${logId}] UseCaseError: ${message}` +
        (innerError ? ` | InnerError: ${innerError.message}` : ''),
    );
  }
}
