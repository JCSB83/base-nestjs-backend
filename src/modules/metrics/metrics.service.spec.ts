import * as client from '@prometheus-io/client';
import { MetricsService } from './metrics.service';

jest.mock('@prometheus-io/client', () => ({
  Registry: jest.fn(),
  collectDefaultMetrics: jest.fn(),
  Counter: jest.fn(),
  Histogram: jest.fn(),
}));

describe('MetricsService', () => {
  const metrics = jest.fn<Promise<string>, []>();
  const inc = jest.fn();
  const observe = jest.fn();
  const registry = {
    metrics,
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
  };
  let service: MetricsService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(client.Registry)
      .mockImplementation(() => registry as unknown as client.Registry);
    jest
      .mocked(client.Counter)
      .mockImplementation(() => ({ inc }) as unknown as client.Counter<string>);
    jest
      .mocked(client.Histogram)
      .mockImplementation(
        () => ({ observe }) as unknown as client.Histogram<string>,
      );
    service = new MetricsService();
  });

  it('registra las métricas por defecto en un registro propio y expone su contenido', async () => {
    expect(client.collectDefaultMetrics).toHaveBeenCalledWith({
      register: registry,
    });
    metrics.mockResolvedValue('metric 1');
    await expect(service.getMetrics()).resolves.toBe('metric 1');
    expect(service.getContentType()).toBe(registry.contentType);
  });

  it('propaga errores del registro', async () => {
    const error = new Error('collection failed');
    metrics.mockRejectedValue(error);
    await expect(service.getMetrics()).rejects.toBe(error);
  });

  it('crea y reutiliza contadores independientemente del orden de etiquetas', () => {
    service.incrementCounter('requests', 'Requests', { z: 'last', a: 'first' });
    service.incrementCounter(
      'requests',
      'Requests',
      { a: 'other', z: 'last' },
      3,
    );
    expect(client.Counter).toHaveBeenCalledTimes(1);
    expect(client.Counter).toHaveBeenCalledWith({
      name: 'requests',
      help: 'Requests',
      labelNames: ['a', 'z'],
      registers: [registry],
    });
    expect(inc).toHaveBeenNthCalledWith(1, { z: 'last', a: 'first' }, 1);
    expect(inc).toHaveBeenNthCalledWith(2, { a: 'other', z: 'last' }, 3);
  });

  it('rechaza cambios de etiquetas en un contador existente', () => {
    service.incrementCounter('requests', 'Requests', { method: 'GET' });
    expect(() =>
      service.incrementCounter('requests', 'Requests', { route: '/' }),
    ).toThrow(
      "Counter 'requests' ya existe con labels [method], pero intentaste usar [route]",
    );
    expect(inc).toHaveBeenCalledTimes(1);
  });

  it('crea y reutiliza histogramas con buckets y etiquetas ordenadas', () => {
    service.observeHistogram(
      'duration',
      'Duration',
      { z: 'last', a: 'first' },
      0.25,
    );
    service.observeHistogram(
      'duration',
      'Duration',
      { a: 'first', z: 'last' },
      0,
    );
    expect(client.Histogram).toHaveBeenCalledTimes(1);
    expect(client.Histogram).toHaveBeenCalledWith({
      name: 'duration',
      help: 'Duration',
      labelNames: ['a', 'z'],
      registers: [registry],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });
    expect(observe).toHaveBeenNthCalledWith(1, { z: 'last', a: 'first' }, 0.25);
    expect(observe).toHaveBeenNthCalledWith(2, { a: 'first', z: 'last' }, 0);
  });

  it('rechaza cambios de etiquetas en un histograma existente', () => {
    service.observeHistogram('duration', 'Duration', { method: 'GET' }, 1);
    expect(() =>
      service.observeHistogram('duration', 'Duration', {}, 1),
    ).toThrow("Histogram 'duration' tiene etiquetas diferentes");
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('soporta métricas sin etiquetas y separa nombres distintos', () => {
    for (const name of ['first', 'second']) {
      service.incrementCounter(name, name, {}, 0);
      service.incrementCounter(name, name, {});
      service.observeHistogram(name, name, {}, 0);
      service.observeHistogram(name, name, {}, 1);
    }
    expect(client.Counter).toHaveBeenCalledTimes(2);
    expect(client.Histogram).toHaveBeenCalledTimes(2);
    expect(inc).toHaveBeenCalledTimes(4);
    expect(observe).toHaveBeenCalledTimes(4);
  });

  it('propaga errores del cliente al incrementar u observar', () => {
    inc.mockImplementation(() => {
      throw new Error('invalid counter');
    });
    observe.mockImplementation(() => {
      throw new Error('invalid histogram');
    });
    expect(() => service.incrementCounter('counter', '', {})).toThrow(
      'invalid counter',
    );
    expect(() => service.observeHistogram('histogram', '', {}, 1)).toThrow(
      'invalid histogram',
    );
  });
});
