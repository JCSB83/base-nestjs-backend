import { Injectable, LoggerService } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { AppConfig } from 'src/app.config';

export enum LogLevel {
    ALL = 'ALL',
    TRACE = 'TRACE',
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    MARK = 'MARK',
    WARN = 'WARN',
    ERROR = 'ERROR',
    FATAL = 'FATAL',
    OFF = 'OFF',
}

@Injectable()
export class LokiLoggerService implements LoggerService {
    private readonly client: AxiosInstance;

    constructor(private readonly appConfig: AppConfig) {
        this.client = axios.create({
            baseURL: appConfig.lokiURL,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    log(message: unknown, ...optionalParams: unknown[]): void {
        if (!this.shouldLog(LogLevel.INFO)) {
            return;
        }
        this.send('info', message, optionalParams);
    }

    error(message: unknown, ...optionalParams: unknown[]): void {
        if (!this.shouldLog(LogLevel.ERROR)) { 
            return;
        }        
        this.send('error', message, optionalParams);
    }

    warn(message: unknown, ...optionalParams: unknown[]): void {
        if (!this.shouldLog(LogLevel.WARN)) { 
            return;
        }
        this.send('warn', message, optionalParams);
    }

    debug(message: unknown, ...optionalParams: unknown[]): void {
        if (!this.shouldLog(LogLevel.DEBUG)) { 
            return;
        }
        this.send('debug', message, optionalParams);
    }

    verbose(message: unknown, ...optionalParams: unknown[]): void {
        if (!this.shouldLog(LogLevel.TRACE)) { 
            return;
        }
        this.send('trace', message, optionalParams);
    }

    private readonly logPriorities: Record<LogLevel, number> = {
        [LogLevel.ALL]: 0,
        [LogLevel.TRACE]: 1,
        [LogLevel.DEBUG]: 2,
        [LogLevel.INFO]: 3,
        [LogLevel.MARK]: 4,
        [LogLevel.WARN]: 5,
        [LogLevel.ERROR]: 6,
        [LogLevel.FATAL]: 7,
        [LogLevel.OFF]: 8
    };

    private shouldLog(level: LogLevel): boolean {
    return this.appConfig.logLevel !== LogLevel.OFF &&
           this.logPriorities[level] >= this.logPriorities[this.appConfig.logLevel];
    }

    private send(level: string, message: unknown, optionalParams: unknown[]): void {
        const timestamp = `${Date.now()}000000`;
        const date = new Date();
        const formattedDate = `[${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ` +
                              `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}]`;
        const formattedMessage = this.formatMessage(message, optionalParams);                          
        let lokiStatus = '[loki ON]';
        const body = {
            streams: [{
                stream: {
                    app: this.appConfig.appName,
                    environment: this.appConfig.environment,
                    level
                },
                values: [
                    [
                        timestamp,
                        formattedMessage,
                    ]
                ]
            }]
        };
        void this.client
        .post('/loki/api/v1/push', body)
        .catch(error => {
            // Nunca llamar this.error() aquí.
            // Si Loki está caído crearíamos recursión infinita.
            console.error('Error enviando log a Loki:', error);
            lokiStatus = '[loki OFF]';
        }).finally(() => {
            this.writeConsole(level, formattedDate, lokiStatus, formattedMessage);
        });
    }

    private formatMessage(message: unknown, optionalParams: unknown[]): string {
        if (message instanceof Error) {
            return JSON.stringify({
                message: message.message,
                stack: message.stack,
                params: optionalParams,
            });
        }
        return JSON.stringify({
            message,
            params: optionalParams,
        });
    }

    private writeConsole(level: string,
                         formatted: string,
                         lokiStatus: string,
                         message: string) {
        const tag = `[${level.toUpperCase()}]`;
        switch (level) {
            case 'info': console.log(`\x1b[32m${formatted} ${lokiStatus} ${tag} ${message}\x1b[0m`);
                break;
            case 'error': console.log(`\x1b[31m${formatted} ${lokiStatus} ${tag} ${message}\x1b[0m`);
                break;
            case 'warn': console.log(`\x1b[33m${formatted} ${lokiStatus} ${tag} ${message}\x1b[0m`);
                break;
            case 'debug': console.debug(`\x1b[34m${formatted} ${lokiStatus} ${tag} ${message}\x1b[0m`);
                break;
            case 'trace': console.log(`\x1b[35m${formatted} ${lokiStatus} ${tag} ${message}\x1b[0m`);
                break;
        }
    }
}
