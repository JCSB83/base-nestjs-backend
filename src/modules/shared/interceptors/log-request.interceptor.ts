import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Utils } from '../utils/utils';

@Injectable()
export class LogRequestInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LogRequestInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();

        req.logId ||= Utils.generateLogId();
        req.logData ??= true;

        const start = process.hrtime.bigint();

        let message = '';
        let data = '';
        let errorStatus: number | undefined;
        let logged = false;

        const writeLog = (aborted: boolean): void => {
            if (logged) { 
                return;
            }
            logged = true;
            const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
            const status = errorStatus ?? res.statusCode;
            let logMsg = `[${req.logId}] STATUS=${status} PATH=${req.method}:${req.originalUrl || req.url}`;
            if (message) { 
                logMsg += ` MESSAGE=${message}`; 
            }
            if (data) { 
                logMsg += ` DATA=${data}`; 
            }
            logMsg += ` TIME=${elapsed.toFixed(2)}ms`;
            if (aborted) { 
                logMsg += ' ABORTED=true'; 
            }
            const statusCode = Math.floor(status / 100);
            switch(statusCode) {
                case 2: this.logger.log(logMsg); break;
                case 4: this.logger.warn(logMsg); break;
                case 5: this.logger.error(logMsg); break;
                default: this.logger.verbose(logMsg); break;
            }
        };

        res.once('finish', () => writeLog(false));

        res.once('close', () => {
            if (!res.writableFinished) {
                writeLog(true);
            }
        });

        return next.handle().pipe(
            tap((responseData: unknown) => {
                if (!req.logData) { 
                    return;
                }
                if (responseData !== null && typeof responseData === 'object' && 'message' in responseData) {
                    const value = responseData.message;
                    message = typeof value === 'string' ? value : '';
                } else if (typeof responseData === 'string') {
                    message = responseData;
                }
                data = this.serialize(responseData);
            }),
            catchError((error: unknown) => {
                errorStatus = error instanceof HttpException ? error.getStatus() : 500;
                const body = error instanceof HttpException? error.getResponse() : { message: 'Internal server error' };

                if (typeof body === 'string') {
                    message = body;
                } else if (body && typeof body === 'object' && 'message' in body) {
                    const value = body.message;
                    message = typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : '';
                }
                if (req.logData) {
                    data = this.serialize(body);
                }
                return throwError(() => error);
            })
        );
    }

    private serialize(value: unknown): string {
        try {
            return JSON.stringify(value) ?? '';
        } catch {
            return '[Unserializable response]';
        }
    }
}
