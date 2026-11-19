import {
  Logger,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
  RequestMethod,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsMiddleware } from './metrics.middleware';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsMiddleware],
})
export class MetricsModule implements NestModule, OnModuleInit {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(MetricsMiddleware)
      .exclude({
        path: 'metrics',
        method: RequestMethod.GET,
      })
      .forRoutes('*');
  }

  onModuleInit() {
    Logger.log('MetricsModule initialized');
  }
}
