import { Logger, LoggerService, Module, OnModuleInit } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./controllers/health.controller";
import { Log4jsLoggerService } from "./services/log4jsLogger.service";
import { LokiLoggerService } from "./services/lokiLogger.service";
import { LogInterceptor } from "./interceptors/log.interceptor";
import { AppConfig } from "src/app.config";

export const LOGGER_SERVICE = Symbol('LOGGER_SERVICE');

@Module({
    imports: [
        TerminusModule
    ],
    controllers: [
        HealthController
    ],
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
            }
        },
        LogInterceptor
    ],
    exports: [
        LOGGER_SERVICE,
        LogInterceptor,
    ]
})
export class SharedModule implements OnModuleInit {
    onModuleInit() {
        Logger.log('SharedModule initialized');
    }
}