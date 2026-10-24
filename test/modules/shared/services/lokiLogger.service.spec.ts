import axios from 'axios';
import { AppConfig } from '../../../../src/app.config';
import { LokiLoggerService } from '../../../../src/modules/shared/services/lokiLogger.service';

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

describe('LokiLoggerService', () => {
  const post = jest.fn();
  const config = {
    appName: 'test-app',
    environment: 'LOCAL',
    lokiURL: 'http://loki.test:3100',
  } as AppConfig;
  let service: LokiLoggerService;
  const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

  beforeEach(() => {
    post.mockReset().mockResolvedValue({ status: 204 });
    jest
      .mocked(axios.create)
      .mockReturnValue({ post } as unknown as ReturnType<typeof axios.create>);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    service = new LokiLoggerService(config);
  });
  afterEach(() => jest.restoreAllMocks());

  it('configura JSON y timeout para el transporte', () => {
    expect(axios.create).toHaveBeenLastCalledWith({
      baseURL: config.lokiURL,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it.each([
    ['log', 'info'],
    ['error', 'error'],
    ['warn', 'warn'],
    ['debug', 'debug'],
    ['verbose', 'trace'],
  ] as const)(
    'envía %s como %s y muestra el resultado en consola',
    async (method, level) => {
      service[method]('message', { id: 42 });
      expect(post).toHaveBeenCalledWith('/loki/api/v1/push', {
        streams: [
          {
            stream: { app: 'test-app', environment: 'LOCAL', level },
            values: [
              [
                '1700000000000000000',
                JSON.stringify({ message: 'message', params: [{ id: 42 }] }),
              ],
            ],
          },
        ],
      });
      await settle();
      const output = level === 'debug' ? console.debug : console.log;
      expect(output).toHaveBeenCalledWith(
        expect.stringContaining(`[loki ON] [${level.toUpperCase()}]`),
      );
    },
  );

  it('serializa mensaje y stack de Error', async () => {
    const error = new Error('failure');
    service.error(error, 'context');
    const body = post.mock.calls[0][1];
    expect(JSON.parse(body.streams[0].values[0][1])).toEqual({
      message: 'failure',
      stack: error.stack,
      params: ['context'],
    });
    await settle();
  });

  it('absorbe fallos de transporte, marca OFF y no reenvía el error a Loki', async () => {
    const error = new Error('timeout');
    post.mockRejectedValue(error);
    expect(() => service.log('message')).not.toThrow();
    await settle();
    expect(post).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      'Error enviando log a Loki:',
      error,
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[loki OFF]'),
    );
  });

  it('no espera el transporte para devolver el control y escribe en consola al terminar', async () => {
    let finish!: (value: unknown) => void;
    post.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    expect(service.log('pending')).toBeUndefined();
    expect(console.log).not.toHaveBeenCalled();
    finish({ status: 204 });
    await settle();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[loki ON]'),
    );
  });
});
