import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import appConfig from 'src/app.config';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    @InjectDataSource(appConfig.postgres_connectionName)
    private readonly dataSource: DataSource,
  ) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () =>
        this.database.pingCheck('database', { connection: this.dataSource }),
    ]);
  }
}
