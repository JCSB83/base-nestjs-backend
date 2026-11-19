import { Logger } from '@nestjs/common';
import { CommonController } from './common.controller';
import { UseCaseError } from '../errors/usecase.error';
import { ErrorLevel } from '../errors/errorLevel.enum';

class Controller extends CommonController {}

describe('CommonController', () => {
  beforeEach(() =>
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined),
  );
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [ErrorLevel.Validation, 400],
    [ErrorLevel.Unknown, 500],
  ])('transforma errores de caso de uso %s', async (level, status) => {
    const exception = await new Controller().getHttpException(
      new UseCaseError('invalid input', level),
      'operation failed',
      '123',
    );
    expect(exception.getStatus()).toBe(status);
    expect(exception.getResponse()).toEqual({
      statusCode: status,
      logId: '123',
      message: 'operation failed',
      error: 'invalid input',
    });
  });

  it('conserva un mensaje de error vacío', async () => {
    const exception = await new Controller().getHttpException(
      new UseCaseError(''),
      'failed',
      '123',
    );
    expect(exception.getResponse()).toMatchObject({ error: '' });
  });

  it.each([new Error('secret'), null, undefined])(
    'oculta detalles de errores inesperados (%s)',
    async (error: unknown) => {
      const exception = await new Controller().getHttpException(
        error,
        'operation failed',
        '123',
      );
      expect(exception.getStatus()).toBe(500);
      expect(exception.getResponse()).toEqual({
        statusCode: 500,
        logId: '123',
        message: 'login failed',
        error: 'internal server error',
      });
    },
  );
});
