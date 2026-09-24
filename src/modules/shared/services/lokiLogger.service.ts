import { Injectable, LoggerService } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import appConfig from 'src/app.config';

@Injectable()
export class LokiLoggerService implements LoggerService {
    private readonly client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: appConfig.lokiURL,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    log(message: unknown, ...optionalParams: unknown[]): void {
        this.send('info', message, optionalParams);
    }

    error(message: unknown, ...optionalParams: unknown[]): void {
        this.send('error', message, optionalParams);
    }

    warn(message: unknown, ...optionalParams: unknown[]): void {
        this.send('warn', message, optionalParams);
    }

    debug(message: unknown, ...optionalParams: unknown[]): void {
        this.send('debug', message, optionalParams);
    }

    verbose(message: unknown, ...optionalParams: unknown[]): void {
        this.send('trace', message, optionalParams);
    }

    private send(level: string, message: unknown, optionalParams: unknown[]): void {
        const timestamp = `${Date.now()}000000`;
        const body = {
            streams: [{
                stream: {
                    app: appConfig.appName,
                    environment: appConfig.environment,
                    level
                },
                values: [
                    [
                        timestamp,
                        this.formatMessage(message, optionalParams),
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
}