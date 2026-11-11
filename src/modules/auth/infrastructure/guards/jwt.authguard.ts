import { CanActivate, ExecutionContext, HttpStatus, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { Utils } from 'src/modules/shared/utils/utils';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ValidateTokenUseCase } from '../../application/use-cases/validateToken.use-case';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private validateTokenUseCase: ValidateTokenUseCase) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const logId = Utils.generateLogId();
        Logger.log(`[${logId}] JwtAuthGuard.canActivate`);
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader) {
            throw new UnauthorizedException('Authorization header is missing');
        }
        if (!authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Invalid authorization header format');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedException('Token is missing');
        }
        try {
            const validateTokenResult = await this.validateTokenUseCase.execute(token, logId);
            if (!validateTokenResult || !validateTokenResult.user) {
                throw new UnauthorizedException('Invalid or inactive user');
            }
            request.logId = logId;
            request.user = validateTokenResult.user;
            request.userId = validateTokenResult.user.userId;
            request.sessionId = validateTokenResult.session.sessionId;
            return true;
        } catch (error: any) {
            const objError = { statusCode: HttpStatus.UNAUTHORIZED, logId, error: 'UNAUTHORIZED', message: 'UNAUTHORIZED' };
            if (error instanceof UseCaseError) {
                objError.message = error.message;
                throw new UnauthorizedException(objError);
            }
            if (error instanceof UnauthorizedException) {
                objError.message = error.message;
                Logger.error(`[${logId}] ${error.message}`);
                throw new UnauthorizedException(objError);
            }
            new UseCaseError(`Internal server error`, ErrorLevel.Unknown, error, logId);
            throw new InternalServerErrorException({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR, logId, error: 'INTERNAL_SERVER_ERROR' });
        }
    }
}
