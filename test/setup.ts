// Unit tests exercise our controllers and module wiring, not Terminus internals.
// Swagger metadata is verified against the generated document outside these unit mocks.
jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => () => undefined,
  ApiOperation: () => () => undefined,
}));
// Its ESM health decorator loads Swagger via import.meta, outside this CJS test runtime.
jest.mock('@nestjs/terminus', () => {
  const { Module } = jest.requireActual('@nestjs/common');
  class HealthCheckService {
    check = jest.fn();
  }
  class HttpHealthIndicator {
    pingCheck = jest.fn();
  }
  class TerminusModule {}
  Module({
    providers: [HealthCheckService, HttpHealthIndicator],
    exports: [HealthCheckService, HttpHealthIndicator],
  })(TerminusModule);
  return {
    TerminusModule,
    HealthCheckService,
    HttpHealthIndicator,
    HealthCheck: () => () => undefined,
  };
});
