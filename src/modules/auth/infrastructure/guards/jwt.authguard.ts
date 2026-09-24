import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { ValidateTokenUseCase } from '../../application/validateToken.usecase';
import { Utils } from 'src/modules/shared/utils/utils';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private validateTokenUseCase: ValidateTokenUseCase) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const logId = Utils.generateLogId();
        Logger.log(`[${logId}] JwtAuthGuard.canActivate`);
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader) {
            throw new UnauthorizedException('Authorization header is missing.');
        }
        if (!authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Invalid authorization header format.');
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedException('Token is missing.');
        }
        try {
            const validateTokenResult = await this.validateTokenUseCase.execute(token, logId);
            if (!validateTokenResult || !validateTokenResult.user || validateTokenResult.user.isActive === false) {
                throw new UnauthorizedException('Invalid or inactive user.');
            }
            request.logId = logId;
            request.user = validateTokenResult.user;
            request.sessionId = validateTokenResult.session.sessionId;
            return true;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                Logger.error(`[${logId}] Token expired.`);
                throw new UnauthorizedException('Token expired.');
            }
            if (error instanceof JsonWebTokenError) {
                Logger.error(`[${logId}] Invalid token.`);
                throw new UnauthorizedException('Invalid token.');
            }
            Logger.error(`[${logId}] Unauthorized.`);
            throw new UnauthorizedException('Unauthorized.');
        }
    }
}
