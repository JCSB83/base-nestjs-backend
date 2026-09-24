import { Module } from "@nestjs/common";
import { Log4jsLoggerService } from "./services/log4jsLogger.service";
import { LokiLoggerService } from "./services/lokiLogger.service";
import { LogInterceptor } from "./interceptors/log.interceptor";

@Module({
   providers: [
    Log4jsLoggerService,
    LokiLoggerService,
    LogInterceptor
  ],
  exports: [
    Log4jsLoggerService,
    LokiLoggerService, 
    LogInterceptor
  ]
})
export class SharedModule {}