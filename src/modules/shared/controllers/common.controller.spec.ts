import { HttpException, Logger } from '@nestjs/common';
import { CommonController } from './common.controller';
import { UseCaseError } from '../errors/usecase.error';
import { ErrorLevel } from '../errors/errorLevel.enum';
import { ResponseDto } from '../dto/response.dto';
class TestController extends CommonController {}
describe('CommonController', () => {
  const controller = new TestController();
  beforeEach(() =>
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined),
  );
  afterEach(() => jest.restoreAllMocks());
  it.each([
    { level: ErrorLevel.Validation, status: 400 },
    { level: ErrorLevel.Unknown, status: 500 },
    { level: undefined, status: 500 },
  ])('convierte $level en HTTP $status', async ({ level, status }) => {
    const result = await controller.getHttpException(
      new UseCaseError('reason', level),
      'operation failed',
      'log',
    );
    expect(result).toBeInstanceOf(HttpException);
    expect(result.getStatus()).toBe(status);
    expect(result.getResponse()).toBeInstanceOf(ResponseDto);
    expect(result.getResponse()).toEqual({
      statusCode: status,
      logId: 'log',
      message: 'operation failed',
      error: 'reason',
    });
  });
  it('conserva un mensaje de error vacio', async () => {
    const result = await controller.getHttpException(
      new UseCaseError('', ErrorLevel.Validation),
      'failed',
      'log',
    );
    expect(result.getResponse()).toEqual({
      statusCode: 400,
      logId: 'log',
      message: 'failed',
      error: '',
    });
  });
  it.each([new Error('secret'), null, undefined, 'unexpected'])(
    'oculta errores inesperados: %j',
    async (error: unknown) => {
      const result = await controller.getHttpException(
        error,
        'operation failed',
        'log',
      );
      expect(result.getStatus()).toBe(500);
      expect(result.getResponse()).toEqual({
        statusCode: 500,
        logId: 'log',
        message: 'login failed',
        error: 'internal server error',
      });
    },
  );
});
