import { EventEmitter } from 'node:events';
import { ExecutionContext, HttpException, Logger } from '@nestjs/common';
import { defer, EMPTY, lastValueFrom, of, Subject, throwError } from 'rxjs';
import { LogRequestInterceptor } from './log-request.interceptor';
import { Utils } from '../utils/utils';

describe('LogRequestInterceptor', () => {
  let req: {
    logId?: string;
    logData?: boolean | null;
    method: string;
    originalUrl?: string;
    url: string;
  };
  let res: EventEmitter & { statusCode: number; writableFinished: boolean };
  let context: ExecutionContext;
  let interceptor: LogRequestInterceptor;
  let logs: Record<'log' | 'warn' | 'error' | 'verbose', jest.SpyInstance>;
  let generateLogId: jest.SpyInstance;

  beforeEach(() => {
    generateLogId = jest
      .spyOn(Utils, 'generateLogId')
      .mockReturnValue('00000042');
    jest
      .spyOn(process.hrtime, 'bigint')
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValue(1_025_125_000n);
    logs = {
      log: jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined),
      warn: jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined),
      error: jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined),
      verbose: jest
        .spyOn(Logger.prototype, 'verbose')
        .mockImplementation(() => undefined),
    };
    req = { method: 'GET', originalUrl: '/api/users', url: '/users' };
    res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      writableFinished: false,
    });
    context = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
    interceptor = new LogRequestInterceptor();
  });

  afterEach(() => jest.restoreAllMocks());

  function expectNoLogs(): void {
    for (const spy of Object.values(logs)) expect(spy).not.toHaveBeenCalled();
  }

  function expectOnlyLog(level: keyof typeof logs, message: string): void {
    expect(logs[level]).toHaveBeenCalledTimes(1);
    expect(logs[level]).toHaveBeenCalledWith(message);
    for (const other of Object.keys(logs) as (keyof typeof logs)[]) {
      if (other !== level) expect(logs[other]).not.toHaveBeenCalled();
    }
  }

  it.each([
    [{ message: 'ok', data: 1 }, ' MESSAGE=ok DATA={"message":"ok","data":1}'],
    ['ok', ' MESSAGE=ok DATA="ok"'],
    ['', ' DATA=""'],
    [null, ' DATA=null'],
    [undefined, ''],
    [0, ' DATA=0'],
    [false, ' DATA=false'],
    [{ count: 0 }, ' DATA={"count":0}'],
    [{ message: 42 }, ' DATA={"message":42}'],
  ])(
    'conserva la respuesta y registra su contenido al terminar (%s)',
    async (body, detail) => {
      const handle = jest.fn(() => of(body));
      await expect(
        lastValueFrom(interceptor.intercept(context, { handle })),
      ).resolves.toBe(body);
      expect(handle).toHaveBeenCalledTimes(1);
      expect(req.logId).toBe('00000042');
      expect(req.logData).toBe(true);
      expectNoLogs();
      res.emit('finish');
      expectOnlyLog(
        'log',
        '[00000042] STATUS=200 PATH=GET:/api/users' + detail + ' TIME=25.13ms',
      );
    },
  );

  it('conserva el identificador existente y usa url si originalUrl está vacío', async () => {
    req.logId = 'existing';
    req.originalUrl = '';
    await lastValueFrom(
      interceptor.intercept(context, { handle: () => of(undefined) }),
    );
    res.emit('finish');
    expect(generateLogId).not.toHaveBeenCalled();
    expectOnlyLog('log', '[existing] STATUS=200 PATH=GET:/users TIME=25.13ms');
  });

  it('reemplaza un identificador vacío', () => {
    req.logId = '';
    interceptor.intercept(context, { handle: () => EMPTY });
    expect(req.logId).toBe('00000042');
    expect(generateLogId).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, true])(
    'habilita o conserva logData=%s',
    (initial) => {
      req.logData = initial;
      interceptor.intercept(context, { handle: () => EMPTY });
      expect(req.logData).toBe(true);
    },
  );

  it.each(['antes', 'controlador'])(
    'omite el cuerpo si logData se desactiva %s',
    async (stage) => {
      if (stage === 'antes') req.logData = false;
      const body = { message: 'private', secret: 'hidden' };
      await expect(
        lastValueFrom(
          interceptor.intercept(context, {
            handle: () =>
              defer(() => {
                if (stage === 'controlador') req.logData = false;
                return of(body);
              }),
          }),
        ),
      ).resolves.toBe(body);
      expect(req.logData).toBe(false);
      res.emit('finish');
      expectOnlyLog(
        'log',
        '[00000042] STATUS=200 PATH=GET:/api/users TIME=25.13ms',
      );
    },
  );

  it.each([
    [200, 'log'],
    [201, 'log'],
    [204, 'log'],
    [299, 'log'],
    [400, 'warn'],
    [404, 'warn'],
    [499, 'warn'],
    [500, 'error'],
    [503, 'error'],
    [599, 'error'],
    [302, 'verbose'],
  ] as const)(
    'selecciona el nivel para el estado %s',
    async (status, level) => {
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(undefined) }),
      );
      res.statusCode = status;
      res.emit('finish');
      expectOnlyLog(
        level,
        '[00000042] STATUS=' + status + ' PATH=GET:/api/users TIME=25.13ms',
      );
    },
  );

  it.each(['finish', 'close'])(
    'registra una sola vez si %s ocurre primero',
    async (first) => {
      await lastValueFrom(
        interceptor.intercept(context, { handle: () => of(undefined) }),
      );
      res.emit(first);
      res.emit(first === 'finish' ? 'close' : 'finish');
      res.emit(first);
      expectOnlyLog(
        'log',
        '[00000042] STATUS=200 PATH=GET:/api/users TIME=25.13ms' +
          (first === 'close' ? ' ABORTED=true' : ''),
      );
    },
  );

  it('ignora close cuando la respuesta ya terminó', () => {
    interceptor.intercept(context, { handle: () => EMPTY });
    res.writableFinished = true;
    res.emit('close');
    expectNoLogs();
    res.emit('finish');
    expectOnlyLog(
      'log',
      '[00000042] STATUS=200 PATH=GET:/api/users TIME=25.13ms',
    );
  });

  it('registra finish aunque el observable termine sin emitir una respuesta', () => {
    const complete = jest.fn();
    interceptor
      .intercept(context, { handle: () => EMPTY })
      .subscribe({ complete });
    expect(complete).toHaveBeenCalledTimes(1);
    expectNoLogs();
    res.emit('finish');
    expectOnlyLog(
      'log',
      '[00000042] STATUS=200 PATH=GET:/api/users TIME=25.13ms',
    );
  });

  it('registra el aborto HTTP aunque se cancele la suscripción al controlador', () => {
    const source = new Subject<unknown>();
    const subscription = interceptor
      .intercept(context, { handle: () => source })
      .subscribe();
    subscription.unsubscribe();
    expectNoLogs();
    res.emit('close');
    expectOnlyLog(
      'log',
      '[00000042] STATUS=200 PATH=GET:/api/users TIME=25.13ms ABORTED=true',
    );
  });

  it.each([
    [
      new HttpException('denied', 400),
      400,
      'warn',
      ' MESSAGE=denied DATA="denied"',
    ],
    [
      new HttpException({ message: 'invalid' }, 400),
      400,
      'warn',
      ' MESSAGE=invalid DATA={"message":"invalid"}',
    ],
    [
      new HttpException({ message: ['invalid', 'missing'] }, 400),
      400,
      'warn',
      ' MESSAGE=invalid, missing DATA={"message":["invalid","missing"]}',
    ],
    [
      new HttpException({ message: 42 }, 400),
      400,
      'warn',
      ' DATA={"message":42}',
    ],
    [new HttpException({}, 500), 500, 'error', ' DATA={}'],
    [
      new Error('secret'),
      500,
      'error',
      ' MESSAGE=Internal server error DATA={"message":"Internal server error"}',
    ],
  ] as const)(
    'propaga el error y registra su estado al finalizar (%s)',
    async (error, status, level, detail) => {
      await expect(
        lastValueFrom(
          interceptor.intercept(context, {
            handle: () => throwError(() => error),
          }),
        ),
      ).rejects.toBe(error);
      expectNoLogs();
      res.emit('finish');
      expectOnlyLog(
        level,
        '[00000042] STATUS=' +
          status +
          ' PATH=GET:/api/users' +
          detail +
          ' TIME=25.13ms',
      );
    },
  );

  it('conserva el mensaje del error pero omite su cuerpo con logData desactivado', async () => {
    req.logData = false;
    const error = new HttpException('unavailable', 500);
    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => error),
        }),
      ),
    ).rejects.toBe(error);
    res.emit('close');
    expectOnlyLog(
      'error',
      '[00000042] STATUS=500 PATH=GET:/api/users MESSAGE=unavailable TIME=25.13ms ABORTED=true',
    );
  });

  it('tolera respuestas circulares sin transformar la respuesta del controlador', async () => {
    const body: { self?: unknown } = {};
    body.self = body;
    await expect(
      lastValueFrom(interceptor.intercept(context, { handle: () => of(body) })),
    ).resolves.toBe(body);
    res.emit('finish');
    expectOnlyLog(
      'log',
      '[00000042] STATUS=200 PATH=GET:/api/users DATA=[Unserializable response] TIME=25.13ms',
    );
  });

  it('tolera un cuerpo de excepción circular y propaga el error original', async () => {
    const body: { message: string; self?: unknown } = { message: 'invalid' };
    body.self = body;
    const error = new HttpException(body, 400);
    await expect(
      lastValueFrom(
        interceptor.intercept(context, {
          handle: () => throwError(() => error),
        }),
      ),
    ).rejects.toBe(error);
    res.emit('finish');
    expectOnlyLog(
      'warn',
      '[00000042] STATUS=400 PATH=GET:/api/users MESSAGE=invalid DATA=[Unserializable response] TIME=25.13ms',
    );
  });
});
