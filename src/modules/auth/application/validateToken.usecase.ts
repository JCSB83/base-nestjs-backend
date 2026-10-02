import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { JwtService } from '@nestjs/jwt';
import appConfig from 'src/app.config';
import { AUTH_REPOSITORY } from '../infrastructure/repositories/auth.repository';
import type { IAuthRepository } from '../domain/repositories/auth.repository.interface';
import { IUser } from '../domain/models/user.interface';
import { ISession } from '../domain/models/session.interface';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';

@Injectable()
export class ValidateTokenUseCase {
    constructor(
        private readonly jwtService: JwtService,
        @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository        
    ) {}

    async execute(token: string, logId: string): Promise<{ user: IUser | undefined, session: ISession } | undefined> {
        Logger.log(`[${logId}] ValidateTokenUseCase.execute`);
        let decoded: any = undefined;
        let jti: string;
        try {
            decoded = this.jwtService.verify(token, { secret: appConfig.jwtSecret });
            jti = decoded.jti;
        } catch (error: any) {
            throw new UseCaseError('Internal server error', ErrorLevel.Validation, error, logId);
        }
        try {
            const session = await this.authRepository.getSessionByJTI(jti, logId);
            if (session) {
                const user = await this.authRepository.getActiveUserByUserId(decoded.sub, logId);
                return { user, session };
            }
        } catch (error: any) {
            throw new UseCaseError('Internal server error', ErrorLevel.Unknown, error, logId);
        }
    }  
}
