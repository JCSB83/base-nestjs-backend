import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { AppConfigModule } from './app.config.module';
import { SharedModule } from './shared/shared.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
    MetricsModule,
    SharedModule
  ],
})
export class AppModule implements OnModuleInit {
  onModuleInit() {
    Logger.log('AppModule initialized');
  }
}
