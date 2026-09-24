import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { catchError, finalize, Observable, tap, throwError } from "rxjs";
import { Utils } from "src/modules/shared/utils/utils";

@Injectable()
export class LogInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        if (!req.logId || req.logId === '') {
            req.logId = Utils.generateLogId();    
        }
        Logger.log(`[${req.logId}] PATH=${req.method}:${req.originalUrl || req.url}`);
        req.logData = true;
        
        const start = Date.now();
        let message = '';
        let data = '';
        let errorStatus: number | undefined;
        
        return next.handle().pipe(
            tap((responseData) => {
                if (!req.logData)
                    return;
                if (responseData && typeof responseData === 'object' && 'message' in responseData) {
                    message = responseData.message;
                } else if (typeof responseData === 'string') {
                    message = responseData;
                }
                data = JSON.stringify(responseData);
            }),
            catchError((error: unknown) => {
                errorStatus = error instanceof HttpException ? error.getStatus() : 500;
                const body = error instanceof HttpException ? error.getResponse() : { message: 'Internal server error' };
                message = typeof body === 'string' ? body : String((body as { message?: unknown }).message ?? '');
                if (req.logData) {
                    data = JSON.stringify(body);
                }
                return throwError(() => error);
            }),
            finalize(() => {
                const elapsed = Date.now() - start;
                const status = errorStatus ?? res.statusCode;

                let logMsg = `[${req.logId}] STATUS=${status}`;
                if (message) {
                    logMsg += ` MESSAGE=${message}`;
                }
                if (data) {
                    logMsg += ` DATA=${data}`;
                }
                logMsg += ` TIME=${elapsed}ms`;

                const statusCode = Math.floor(status / 100);
                switch (statusCode) {
                    case 2: Logger.log(logMsg); break;
                    case 4: Logger.warn(logMsg); break;
                    case 5: Logger.error(logMsg); break;
                    default: Logger.verbose(logMsg); break;
                }
            })
        );
    }
}
