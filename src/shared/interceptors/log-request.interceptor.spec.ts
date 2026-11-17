import { ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { defer, lastValueFrom, of, throwError } from 'rxjs';
import { LogRequestInterceptor } from './log-request.interceptor';
import { Utils } from '../utils/utils';

describe('LogRequestInterceptor', () => {
  let req: {
    logId?: string;
    logData?: boolean;
    method: string;
    originalUrl?: string;
    url: string;
  };
  let res: { statusCode: number };
  let context: ExecutionContext;

  beforeEach(() => {
    jest.spyOn(Utils, 'generateLogId').mockReturnValue('00000042');
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValue(1025);
    for (const method of ['log', 'warn', 'error', 'verbose'] as const) {
      jest.spyOn(Logger.prototype, method).mockImplementation(() => undefined);
    }
    req = { method: 'GET', originalUrl: '/api/users', url: '/users' };
    res = { statusCode: 200 };
    context = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [{ message: 'ok', data: 1 }, ' MESSAGE=ok DATA={"message":"ok","data":1}'],
    ['ok', ' MESSAGE=ok DATA="ok"'],
    [null, ' DATA=null'],
    [{ count: 0 }, ' DATA={"count":0}'],
    [undefined, ''],
  ])(
    'conserva la respuesta y registra su contenido (%s)',
    async (body, detail) => {
      const handle = jest.fn(() => of(body));
      await expect(
        lastValueFrom(
          new LogRequestInterceptor().intercept(context, { handle }),
        ),
      ).resolves.toBe(body);
      expect(req.logId).toBe('00000042');
      expect(handle).toHaveBeenCalledTimes(1);
      expect(jest.spyOn(Logger.prototype, 'log')).toHaveBeenNthCalledWith(
        1,
        '[00000042] PATH=GET:/api/users',
      );
      expect(jest.spyOn(Logger.prototype, 'log')).toHaveBeenLastCalledWith(
        '[00000042] STATUS=200' + detail + ' TIME=25ms',
      );
    },
  );

  it.each([
    [204, 'log'],
    [404, 'warn'],
    [503, 'error'],
    [302, 'verbose'],
  ] as const)('selecciona el nivel para status %s', async (status, level) => {
    req.logId = 'existing';
    req.originalUrl = '';
    res.statusCode = status;
    await lastValueFrom(
      new LogRequestInterceptor().intercept(context, {
        handle: () => of('body'),
      }),
    );
    expect(jest.mocked(Utils).generateLogId).not.toHaveBeenCalled();
    expect(jest.spyOn(Logger.prototype, 'log')).toHaveBeenCalledWith(
      '[existing] PATH=GET:/users',
    );
    expect(jest.spyOn(Logger.prototype, level)).toHaveBeenLastCalledWith(
      '[existing] STATUS=' + status + ' MESSAGE=body DATA="body" TIME=25ms',
    );
  });

  it('genera un identificador vacío y respeta logData desactivado por el controlador', async () => {
    req.logId = '';
    await lastValueFrom(
      new LogRequestInterceptor().intercept(context, {
        handle: () =>
          defer(() => {
            req.logData = false;
            return of({ message: 'private' });
          }),
      }),
    );
    expect(jest.mocked(Utils).generateLogId).toHaveBeenCalledTimes(1);
    expect(jest.spyOn(Logger.prototype, 'log')).toHaveBeenLastCalledWith(
      '[00000042] STATUS=200 TIME=25ms',
    );
  });

  it.each([
    [new HttpException('denied', 403), 403, 'warn', 'denied', '"denied"'],
    [
      new HttpException({ message: ['invalid', 'missing'] }, 400),
      400,
      'warn',
      'invalid,missing',
      '{"message":["invalid","missing"]}',
    ],
    [new HttpException({}, 502), 502, 'error', '', '{}'],
    [
      new Error('secret'),
      500,
      'error',
      'Internal server error',
      '{"message":"Internal server error"}',
    ],
  ] as const)(
    'propaga el error y registra el estado efectivo (%s)',
    async (error, status, level, message, data) => {
      await expect(
        lastValueFrom(
          new LogRequestInterceptor().intercept(context, {
            handle: () => throwError(() => error),
          }),
        ),
      ).rejects.toBe(error);
      expect(jest.spyOn(Logger.prototype, level)).toHaveBeenCalledWith(
        '[00000042] STATUS=' +
          status +
          (message ? ' MESSAGE=' + message : '') +
          ' DATA=' +
          data +
          ' TIME=25ms',
      );
    },
  );

  it('omite el cuerpo de errores si logData está desactivado', async () => {
    const error = new HttpException('unavailable', 503);
    await expect(
      lastValueFrom(
        new LogRequestInterceptor().intercept(context, {
          handle: () =>
            defer(() => {
              req.logData = false;
              return throwError(() => error);
            }),
        }),
      ),
    ).rejects.toBe(error);
    expect(jest.spyOn(Logger.prototype, 'error')).toHaveBeenCalledWith(
      '[00000042] STATUS=503 MESSAGE=unavailable TIME=25ms',
    );
  });
});
