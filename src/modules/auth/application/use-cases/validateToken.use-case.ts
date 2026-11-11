import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { AuthConfig } from '../../auth.config';
import { ISession } from '../../domain/models/session.interface';
import { IUser } from '../../domain/models/user.interface';
import { USER_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/user.repository';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { SESSION_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/session.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';

@Injectable()
export class ValidateTokenUseCase {
    constructor(
        private readonly authConfig: AuthConfig,
        private readonly jwtService: JwtService,
        @Inject(SESSION_REPOSITORY) private readonly sessionRepository: ISessionRepository,
        @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository
    ) {}

    async execute(token: string, logId: string): Promise<{ user: IUser | undefined, session: ISession } | undefined> {
        Logger.log(`[${logId}] ValidateTokenUseCase.execute`);
        let decoded: any = undefined;
        let jti: string;
        try {
            decoded = this.jwtService.verify(token, { secret: this.authConfig.jwtSecret });
            jti = decoded.jti;
        } catch (error: any) {
            if (error instanceof TokenExpiredError) {
                throw new UseCaseError('Token expired', ErrorLevel.Validation, error, logId);
            }
            if (error instanceof JsonWebTokenError) {
                throw new UseCaseError('Invalid token', ErrorLevel.Validation, error, logId);
            }
            throw new UseCaseError('Internal server error', ErrorLevel.Unknown, error, logId);
        }
        try {
            const session = await this.sessionRepository.getSessionByJTI(jti, logId);
            if (session) {
                const user = await this.userRepository.getActiveUserByUserId(decoded.sub, logId);
                return { user, session };
            }
        } catch (error: any) {
            throw new UseCaseError('Internal server error', ErrorLevel.Unknown, error, logId);
        }
    }  
}
