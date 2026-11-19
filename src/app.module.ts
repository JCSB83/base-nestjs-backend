import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { AppConfigModule } from './app.config.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { SharedModule } from './modules/shared/shared.module';

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
