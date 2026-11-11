import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { JwtService } from '@nestjs/jwt';
import { AccessDto } from '../../presentation/dto/access.dto';
import { LoginDto } from '../../presentation/dto/login.dto';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { USER_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/user.repository';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { Utils } from '../../infrastructure/utils/utils';
import { AuthConfig } from '../../auth.config';
import { ISession } from '../../domain/models/session.interface';
import { IRefreshToken } from '../../domain/models/refreshToken.interface';
import { SESSION_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/session.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';

@Injectable()
export class LoginUseCase {
    constructor(
        private readonly authConfig: AuthConfig,
        private readonly jwtService: JwtService,
        @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
        @Inject(SESSION_REPOSITORY) private readonly sessionRepository: ISessionRepository
    ) {}

    async execute(loginDto: LoginDto, logId: string): Promise<AccessDto> {
        Logger.log(`[${logId}] LoginUseCase.execute`);
        try {
            const user = await this.userRepository.getUserByEmailAndPassword(loginDto.email, loginDto.password, logId);
            if(!user) {
                throw new UseCaseError('User not found', ErrorLevel.Validation, undefined, logId);
            }
            if (!user.isActive) {
                throw new UseCaseError('User is not active', ErrorLevel.Validation, undefined, logId);
            }
            const jti = Utils.generateJti();
            const payload = { displayName: user.displayName, sub: user.userId, jti };
            const strAccessToken = this.jwtService.sign(payload, {
                expiresIn: this.authConfig.jwtExpiresIn,
                secret: this.authConfig.jwtSecret
            });
            const refreshPayload = { displayName: user.displayName, sub: user.userId, jti };
            const strRefreshToken = this.jwtService.sign(refreshPayload, {
                expiresIn: this.authConfig.jwtRefreshExpiresIn,
                secret: this.authConfig.jwtRefreshSecret
            });
            const decodedAccessToken = this.jwtService.decode(strAccessToken);
            const session: ISession = {
                sessionId: undefined,
                userId: user.userId,
                jti: payload.jti,
                expiresAt: new Date(decodedAccessToken.exp * 1000)
            };
            const decodedRefreshToken = this.jwtService.decode(strRefreshToken);
            const refreshToken: IRefreshToken = {
                userId: user.userId,
                jti: refreshPayload.jti,
                expiresAt: new Date(decodedRefreshToken.exp * 1000)
            }
            await this.sessionRepository.saveSessionAndRefreshToken(undefined, session, refreshToken, logId);
            const accessDto = new AccessDto();
            accessDto.accessToken = strAccessToken;
            accessDto.refreshToken = strRefreshToken;
            Logger.log(`[${logId}] Login successfully for userId "${user.userId}"`);
            return accessDto;
        } catch (error: any) {
            if(error instanceof UseCaseError) {
                throw error;
            }
            throw new UseCaseError('Internal server error', ErrorLevel.Unknown, error, logId);
        }
    }
}
