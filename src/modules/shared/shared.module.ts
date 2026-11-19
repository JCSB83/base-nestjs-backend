import { Logger, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { Log4jsLoggerService } from './services/log4jsLogger.service';
import { LokiLoggerService } from './services/lokiLogger.service';
import { LogRequestInterceptor } from './interceptors/log-request.interceptor';
import { AppConfig } from '@/app.config';

export const LOGGER_SERVICE = Symbol('LOGGER_SERVICE');

@Module({
  providers: [
    {
      provide: LOGGER_SERVICE,
      inject: [AppConfig],
      useFactory: (appConfig: AppConfig): LoggerService => {
        switch (appConfig.logMode) {
          case 'loki':
            return new LokiLoggerService(appConfig);
          case 'log4js':
            return new Log4jsLoggerService(appConfig);
          default:
            throw new Error('Invalid logger provider');
        }
      },
    },
    LogRequestInterceptor,
  ],
  exports: [LOGGER_SERVICE, LogRequestInterceptor],
})
export class SharedModule implements OnModuleInit {
  onModuleInit() {
    Logger.log('SharedModule initialized');
  }
}
