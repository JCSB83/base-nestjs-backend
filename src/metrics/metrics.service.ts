import { Injectable } from '@nestjs/common';
import * as client from '@prometheus-io/client';

@Injectable()
export class MetricsService {
  private readonly register: client.Registry;
  private readonly counters = new Map<string, client.Counter<string>>();
  private readonly counterLabels = new Map<string, string[]>();
  private readonly histograms = new Map<string, client.Histogram<string>>();
  private readonly histogramLabels = new Map<string, string[]>();

  constructor() {
    this.register = new client.Registry();
    client.collectDefaultMetrics({
      register: this.register,
    });
  }

  observeHistogram(
    name: string,
    help: string,
    labels: Record<string, string>,
    value: number,
  ): void {
    const histogram = this.getOrCreateHistogram(
      name,
      help,
      Object.keys(labels),
    );
    histogram.observe(labels, value);
  }

  private getOrCreateHistogram(
    name: string,
    help: string,
    labelNames: string[],
  ): client.Histogram<string> {
    const sortedLabels = [...labelNames].sort();
    const existing = this.histograms.get(name);
    if (existing) {
      const expected = this.histogramLabels.get(name) ?? [];
      if (expected.join(',') !== sortedLabels.join(',')) {
        throw new Error(`Histogram '${name}' tiene etiquetas diferentes`);
      }
      return existing;
    }
    const histogram = new client.Histogram({
      name,
      help,
      labelNames: sortedLabels,
      registers: [this.register],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });
    this.histograms.set(name, histogram);
    this.histogramLabels.set(name, sortedLabels);
    return histogram;
  }

  incrementCounter(
    name: string,
    help: string,
    labels: Record<string, string>,
    value: number = 1,
  ): void {
    const counter = this.getOrCreateCounter(name, help, Object.keys(labels));
    counter.inc(labels, value);
  }

  async getMetrics(): Promise<string> {
    return await this.register.metrics();
  }

  public getContentType(): string {
    return this.register.contentType;
  }

  private getOrCreateCounter(
    name: string,
    help: string,
    labelNames: string[],
  ): client.Counter<string> {
    const existingCounter = this.counters.get(name);
    if (existingCounter) {
      const expectedLabels = this.counterLabels.get(name) ?? [];
      const currentLabels = [...labelNames].sort((a, b) => a.localeCompare(b));
      if (expectedLabels.join(',') !== currentLabels.join(',')) {
        throw new Error(
          `Counter '${name}' ya existe con labels [${expectedLabels.join(', ')}], ` +
            `pero intentaste usar [${currentLabels.join(', ')}]`,
        );
      }
      return existingCounter;
    }
    const sortedLabelNames = [...labelNames].sort((a, b) => a.localeCompare(b));
    const counter = new client.Counter({
      name,
      help: help,
      labelNames: sortedLabelNames,
      registers: [this.register],
    });
    this.counters.set(name, counter);
    this.counterLabels.set(name, sortedLabelNames);
    return counter;
  }
}
