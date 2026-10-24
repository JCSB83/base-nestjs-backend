import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./controllers/health.controller";
import { Log4jsLoggerService } from "./services/log4jsLogger.service";
import { LokiLoggerService } from "./services/lokiLogger.service";
import { LogInterceptor } from "./interceptors/log.interceptor";

@Module({
    imports: [
        TerminusModule
    ],
    controllers: [
        HealthController
    ],
    providers: [
        Log4jsLoggerService,
        LokiLoggerService,
        LogInterceptor
    ],
    exports: [
        Log4jsLoggerService,
        LokiLoggerService,
        LogInterceptor,
    ]
})
export class SharedModule {}