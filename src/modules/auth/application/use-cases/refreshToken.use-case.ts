import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { JwtService } from '@nestjs/jwt';
import { AccessDto } from '../../presentation/dto/access.dto';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { AuthConfig } from '../../auth.config';
import { Utils } from '../../infrastructure/utils/utils';
import { ISession } from '../../domain/models/session.interface';
import { IRefreshToken } from '../../domain/models/refreshToken.interface';
import { REFRESHTOKEN_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/refreshToken.repository';
import type { IRefreshTokenRepository } from '../../domain/repositories/refreshToken.repository.interface';
import { USER_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/user.repository';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { SESSION_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/session.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';

@Injectable()
export class RefreshTokenUseCase {
    constructor(
        private readonly authConfig: AuthConfig,
        private jwtService: JwtService,
        @Inject(REFRESHTOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
        @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
        @Inject(SESSION_REPOSITORY) private readonly sessionRepository: ISessionRepository
    ) {}

    async execute(refresh_token: string, logId: string): Promise<AccessDto> {
        Logger.log(`[${logId}] RefreshTokenUseCase.execute`);
        try {
            this.jwtService.verify(refresh_token, {
                secret: this.authConfig.jwtRefreshSecret
            });
            Logger.log(`[${logId}] json web token verify successful`);
            const decodedRefresh_token = this.jwtService.decode(refresh_token);
            const refreshToken = await this.refreshTokenRepository.getRefreshTokenByJTI(decodedRefresh_token.jti, logId);
            if (!refreshToken) {
                throw new UseCaseError('Refresh token not found', ErrorLevel.Validation, undefined, logId);
            }
            Logger.log(`[${logId}] RefreshToken found for userId "${refreshToken.userId}"`);
            const user = await this.userRepository.getUserByUserId(refreshToken.userId, logId);
            if (!user) {
                throw new UseCaseError('User not found', ErrorLevel.Validation, undefined, logId);
            }
            if (!user.isActive) {
                throw new UseCaseError('User is not active', ErrorLevel.Validation, undefined, logId);
            }
            const jti = Utils.generateJti();
            const payload = { displayName: user.displayName, sub: user.userId, jti };
            const strAccessToken = this.jwtService.sign(payload, {
                expiresIn: this.authConfig.jwtExpiresIn,
                secret: this.authConfig.jwtSecret,
            });
            const refreshPayload = { displayName: user.displayName, sub: user.userId, jti };
            const strRefreshToken = this.jwtService.sign(refreshPayload, {
                expiresIn: this.authConfig.jwtRefreshExpiresIn,
                secret: this.authConfig.jwtRefreshSecret,
            });
            const decodedAccessToken = this.jwtService.decode(strAccessToken);
            const session : ISession = {
                userId: user.userId,
                jti: payload.jti,
                expiresAt: new Date(decodedAccessToken.exp * 1000)
            }
            const decodedRefreshToken = this.jwtService.decode(strRefreshToken);
            const newRefreshToken: IRefreshToken = {
                userId: user.userId,
                jti: refreshPayload.jti,
                expiresAt: new Date(decodedRefreshToken.exp * 1000)
            };
            await this.sessionRepository.saveSessionAndRefreshToken(decodedRefresh_token.jti, session, newRefreshToken, logId);
            const accessDto = new AccessDto();
            accessDto.accessToken = strAccessToken;
            accessDto.refreshToken = strRefreshToken;
            Logger.log(`[${logId}] Session refreshed successfully for userId "${user.userId}"`);
            return accessDto;
        } catch (error: any) {
            if(error instanceof UseCaseError) {
                throw error;
            }             
            throw new UseCaseError('Internal server error', ErrorLevel.Unknown, error, logId);
        }
    }
}
