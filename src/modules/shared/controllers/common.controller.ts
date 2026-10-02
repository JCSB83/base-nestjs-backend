import { HttpException } from "@nestjs/common";
import { UseCaseError } from "../errors/usecase.error";
import { ResponseDto } from "../utils/infrastructure/response.dto";
import { ErrorLevel } from "../errors/errorLevel.enum";

export abstract class CommonController {
    public async getHttpException(error: any, message: string, logId: string): Promise<HttpException> {
        if(error instanceof UseCaseError) {
            return new HttpException(
                new ResponseDto({
                    statusCode: error.level === ErrorLevel.Validation ? 400 : 500,
                    logId: logId,
                    message: message,
                    error: error.message || ''
                }), 
                error.level === ErrorLevel.Validation ? 400 : 500
            );
        }
        return new HttpException(
            new ResponseDto({ 
                statusCode: 500, 
                logId: logId, 
                message: 'login failed', 
                error: 'internal server error' }), 
            500
        );
    }
}