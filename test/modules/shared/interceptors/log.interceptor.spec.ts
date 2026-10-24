import { ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { defer, lastValueFrom, of, throwError } from 'rxjs';
import { LogInterceptor } from '../../../../src/modules/shared/interceptors/log.interceptor';
import { Utils } from '../../../../src/modules/shared/utils/utils';

describe('LogInterceptor', () => {
  let req: {
    method: string;
    originalUrl?: string;
    url: string;
    logId?: string;
    logData?: boolean;
  };
  let res: { statusCode: number };
  let context: ExecutionContext;
  const interceptor = new LogInterceptor();

  beforeEach(() => {
    for (const method of ['log', 'warn', 'error', 'verbose'] as const)
      jest.spyOn(Logger, method).mockImplementation(() => undefined);
    jest.spyOn(Utils, 'generateLogId').mockReturnValue('00000042');
    jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValue(125);
    req = { method: 'GET', originalUrl: '/health/live', url: '/live' };
    res = { statusCode: 200 };
    context = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
  });
  afterEach(() => jest.restoreAllMocks());

  it('conserva la respuesta y registra identificador, ruta, estado, cuerpo y duración', async () => {
    const body = { message: 'ok', count: 2 };
    await expect(
      lastValueFrom(interceptor.intercept(context, { handle: () => of(body) })),
    ).resolves.toBe(body);
    expect(req.logId).toBe('00000042');
    expect(Logger.log).toHaveBeenNthCalledWith(
      1,
      '[00000042] PATH=GET:/health/live',
    );
    expect(Logger.log).toHaveBeenLastCalledWith(
      '[00000042] STATUS=200 MESSAGE=ok DATA={"message":"ok","count":2} TIME=25ms',
    );
  });

  it('reutiliza un identificador existente y usa url si no hay originalUrl', async () => {
    req.logId = 'existing';
    delete req.originalUrl;
    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of('hello') }),
    );
    expect(Utils.generateLogId).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenNthCalledWith(1, '[existing] PATH=GET:/live');
    expect(Logger.log).toHaveBeenLastCalledWith(
      expect.stringContaining('MESSAGE=hello DATA="hello"'),
    );
  });

  it('no incluye cuerpo ni mensaje de éxito cuando el controlador desactiva logData', async () => {
    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () =>
          defer(() => {
            req.logData = false;
            return of({ message: 'secret' });
          }),
      }),
    );
    expect(Logger.log).toHaveBeenLastCalledWith(
      '[00000042] STATUS=200 TIME=25ms',
    );
  });

  it.each([undefined, null, { count: 1 }])(
    'acepta una respuesta sin message: %s',
    async (body) => {
      await expect(
        lastValueFrom(
          interceptor.intercept(context, { handle: () => of(body) }),
        ),
      ).resolves.toEqual(body);
      expect(Logger.log).toHaveBeenLastCalledWith(
        expect.not.stringContaining('MESSAGE='),
      );
    },
  );

  it.each([
    [201, 'log'],
    [400, 'warn'],
    [503, 'error'],
    [302, 'verbose'],
  ] as const)('registra el estado %s con %s', async (status, method) => {
    res.statusCode = status;
    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of('response') }),
    );
    expect(Logger[method]).toHaveBeenLastCalledWith(
      expect.stringContaining(`STATUS=${status}`),
    );
  });

  it.each(['denied', { message: 'denied' }, {}])(
    'mantiene la excepción HTTP y registra su estado: %s',
    async (body) => {
      const error = new HttpException(body, 403);
      await expect(
        lastValueFrom(
          interceptor.intercept(context, {
            handle: () => throwError(() => error),
          }),
        ),
      ).rejects.toBe(error);
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('STATUS=403'),
      );
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`DATA=${JSON.stringify(body)}`),
      );
    },
  );

  it('registra errores inesperados como 500 sin exponer el mensaje interno', async () => {
    const error = new Error('database password');
    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => error),
        }),
      ),
    ).rejects.toBe(error);
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('STATUS=500 MESSAGE=Internal server error'),
    );
    expect(Logger.error).toHaveBeenCalledWith(
      expect.not.stringContaining('database password'),
    );
  });

  it('omite DATA en errores cuando logData está desactivado', async () => {
    const error = new HttpException('unavailable', 503);
    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () =>
            defer(() => {
              req.logData = false;
              return throwError(() => error);
            }),
        }),
      ),
    ).rejects.toBe(error);
    expect(Logger.error).toHaveBeenCalledWith(
      '[00000042] STATUS=503 MESSAGE=unavailable TIME=25ms',
    );
  });
});
