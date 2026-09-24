import { Injectable, LoggerService } from "@nestjs/common";
import * as log4js from 'log4js';
import appConfig from "src/app.config";

@Injectable()
export class Log4jsLoggerService implements LoggerService {
    private static configured = false;
    private readonly logger: log4js.Logger;

    constructor() {
        if (!Log4jsLoggerService.configured) {
            this.configure();
            Log4jsLoggerService.configured = true;
        }
        this.logger = log4js.getLogger(appConfig.appName);
    }
    
    private configure(): void {
        if (Log4jsLoggerService.configured) {
            return;
        }
        log4js.configure({
            appenders: {
                console: {
                    type: 'stdout',
                },
                file: {
                    type: 'dateFile',
                    filename: `${appConfig.logDir}/${appConfig.appName}`,
                    pattern: 'yyyy-MM-dd.log',
                    keepFileExt: true,
                    alwaysIncludePattern: true,
                    fileNameSep: '-',
                    maxLogSize: 2 * 1024 * 1024, //2 MB
                    numBackups: 30,
                    compress: false,
                    layout: {
                        type: 'pattern',
                        pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %m',
                    },            
                },
            },
            categories: {
                default: {
                    appenders: ['console', 'file'],
                    level: appConfig.logLevel,
                },
            },
        });
        Log4jsLoggerService.configured = true;
    }

    log(message: unknown, ...optionalParams: unknown[]): void {
        this.logger.info(message, ...optionalParams);
    }

    error(message: unknown, ...optionalParams: unknown[]): void {
        this.logger.error(message, ...optionalParams);
    }

    warn(message: unknown, ...optionalParams: unknown[]): void {
        this.logger.warn(message, ...optionalParams);
    }

    debug(message: unknown, ...optionalParams: unknown[]): void {
        this.logger.debug(message, ...optionalParams);
    }

    verbose(message: unknown, ...optionalParams: unknown[]): void {
        this.logger.trace(message, ...optionalParams);
    }
}