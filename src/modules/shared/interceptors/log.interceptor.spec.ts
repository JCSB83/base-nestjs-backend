import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Logger,
} from '@nestjs/common';
import { defer, lastValueFrom, of, Subject, throwError } from 'rxjs';
import { LogInterceptor } from './log.interceptor';
import { Utils } from '../utils/utils';
describe('LogInterceptor', () => {
  let interceptor: LogInterceptor;
  let req: {
    logId?: string;
    logData?: boolean;
    method: string;
    originalUrl?: string;
    url: string;
  };
  let res: { statusCode: number };
  let context: ExecutionContext;
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let errorLog: jest.SpyInstance;
  let verbose: jest.SpyInstance;
  let generate: jest.SpyInstance;
  beforeEach(() => {
    log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    verbose = jest
      .spyOn(Logger.prototype, 'verbose')
      .mockImplementation(() => undefined);
    generate = jest.spyOn(Utils, 'generateLogId').mockReturnValue('generated');
    jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValue(125);
    req = {
      logId: 'log',
      method: 'GET',
      originalUrl: '/original',
      url: '/fallback',
    };
    res = { statusCode: 200 };
    context = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
    interceptor = new LogInterceptor();
  });
  afterEach(() => jest.restoreAllMocks());
  it('conserva logId y devuelve la respuesta sin modificarla', async () => {
    const response = { message: 'ok', data: { id: 1 } };
    const handle = jest.fn(() => of(response));
    await expect(
      lastValueFrom(interceptor.intercept(context, { handle })),
    ).resolves.toBe(response);
    expect(handle).toHaveBeenCalledTimes(1);
    expect(generate).not.toHaveBeenCalled();
    expect(req.logData).toBe(true);
    expect(log).toHaveBeenNthCalledWith(1, '[log] PATH=GET:/original');
    expect(log).toHaveBeenNthCalledWith(
      2,
      '[log] STATUS=200 MESSAGE=ok DATA=' +
        JSON.stringify(response) +
        ' TIME=25ms',
    );
  });
  it.each([undefined, ''])(
    'genera logId cuando esta ausente: %j',
    async (logId) => {
      req.logId = logId;
      delete req.originalUrl;
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(undefined) }),
      );
      expect(req.logId).toBe('generated');
      expect(generate).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenNthCalledWith(1, '[generated] PATH=GET:/fallback');
    },
  );
  it.each([
    { response: 'ok', suffix: ' MESSAGE=ok DATA="ok"' },
    { response: { count: 1 }, suffix: ' DATA={"count":1}' },
    { response: null, suffix: ' DATA=null' },
    { response: undefined, suffix: '' },
    { response: 42, suffix: ' DATA=42' },
    { response: '', suffix: ' DATA=""' },
  ])('formatea respuesta %j', async ({ response, suffix }) => {
    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of(response) }),
    );
    expect(log).toHaveBeenLastCalledWith(
      '[log] STATUS=200' + suffix + ' TIME=25ms',
    );
  });
  it('respeta logData=false establecido por el controlador', async () => {
    const response = { message: 'secret', token: 'secret-token' };
    const next: CallHandler = {
      handle: () =>
        defer(() => {
          req.logData = false;
          return of(response);
        }),
    };
    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toBe(response);
    expect(log).toHaveBeenLastCalledWith('[log] STATUS=200 TIME=25ms');
  });
  it.each([
    { status: 201, level: 'log' },
    { status: 400, level: 'warn' },
    { status: 503, level: 'error' },
    { status: 302, level: 'verbose' },
  ] as const)(
    'registra estado $status con $level',
    async ({ status, level }) => {
      res.statusCode = status;
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(undefined) }),
      );
      const selected = { log, warn, error: errorLog, verbose }[level];
      expect(selected).toHaveBeenLastCalledWith(
        '[log] STATUS=' + status + ' TIME=25ms',
      );
    },
  );
  it.each([
    { body: 'denied', message: 'denied' },
    { body: { message: 'invalid' }, message: 'invalid' },
    { body: {}, message: '' },
    { body: { message: null }, message: '' },
    { body: { message: ['a', 'b'] }, message: 'a,b' },
  ])(
    'propaga HttpException y registra su cuerpo: %j',
    async ({ body, message }) => {
      const error = new HttpException(body, 403);
      await expect(
        lastValueFrom(
          interceptor.intercept(context, {
            handle: () => throwError(() => error),
          }),
        ),
      ).rejects.toBe(error);
      expect(warn).toHaveBeenCalledWith(
        '[log] STATUS=403' +
          (message ? ' MESSAGE=' + message : '') +
          ' DATA=' +
          JSON.stringify(body) +
          ' TIME=25ms',
      );
      expect(errorLog).not.toHaveBeenCalled();
    },
  );
  it('oculta detalles de errores inesperados y conserva la excepcion', async () => {
    const error = new Error('private database details');
    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => error),
        }),
      ),
    ).rejects.toBe(error);
    expect(errorLog).toHaveBeenCalledWith(
      '[log] STATUS=500 MESSAGE=Internal server error DATA={"message":"Internal server error"} TIME=25ms',
    );
  });
  it('omite el cuerpo de errores si el controlador desactiva logData', async () => {
    const error = new HttpException(
      { message: 'denied', token: 'secret' },
      401,
    );
    const next: CallHandler = {
      handle: () =>
        defer(() => {
          req.logData = false;
          return throwError(() => error);
        }),
    };
    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(error);
    expect(warn).toHaveBeenCalledWith(
      '[log] STATUS=401 MESSAGE=denied TIME=25ms',
    );
  });
  it('finaliza tambien cuando el cliente cancela la suscripcion', () => {
    const pending = new Subject<unknown>();
    const subscription = interceptor
      .intercept(context, { handle: () => pending })
      .subscribe();
    expect(log).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenLastCalledWith('[log] STATUS=200 TIME=25ms');
  });
});
