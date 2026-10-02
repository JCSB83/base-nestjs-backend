import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { JwtService } from '@nestjs/jwt';
import appConfig from 'src/app.config';
import { RepositoryError } from 'src/modules/shared/errors/repository.error';
import { AUTH_REPOSITORY } from '../infrastructure/repositories/auth.repository';
import type { IAuthRepository } from '../domain/repositories/auth.repository.interface';
import { AccessDto } from '../infrastructure/dto/access.dto';
import { IRefreshToken } from '../domain/models/refreshToken.interface';
import { Utils } from 'src/modules/shared/utils/utils';
import { ISession } from '../domain/models/session.interface';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';

@Injectable()
export class RefreshTokenUseCase {
    constructor(
        private jwtService: JwtService,
        @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository        
    ) {}

    async execute(refresh_token: string, logId: string): Promise<AccessDto> {
        Logger.log(`[${logId}] RefreshTokenUseCase.execute`);
        try {
            this.jwtService.verify(refresh_token, {
                secret: appConfig.jwtRefreshSecret
            });
            Logger.log(`[${logId}] json web token verify successful`);
            const decodedRefresh_token = this.jwtService.decode(refresh_token);
            const refreshToken = await this.authRepository.getRefreshTokenByJTI(decodedRefresh_token.jti, logId);
            if (!refreshToken) {
                throw new UseCaseError('Refresh token not found', ErrorLevel.Validation, undefined, logId);
            }
            Logger.log(`[${logId}] RefreshToken found for userId "${refreshToken.userId}"`);
            const user = await this.authRepository.getUserByUserId(refreshToken.userId, logId);
            if (!user) {
                throw new UseCaseError('User not found', ErrorLevel.Validation, undefined, logId);
            }
            if (!user.isActive) {
                throw new UseCaseError('User is not active', ErrorLevel.Validation, undefined, logId);
            }
            const jti = Utils.generateJti();
            const payload = { username: user.userName, sub: user.userId, jti };
            const strAccessToken = this.jwtService.sign(payload, {
                expiresIn: appConfig.jwtExpiresIn,
                secret: appConfig.jwtSecret,
            });
            const refreshPayload = { username: user.userName, sub: user.userId, jti };
            const strRefreshToken = this.jwtService.sign(refreshPayload, {
                expiresIn: appConfig.jwtRefreshExpiresIn,
                secret: appConfig.jwtRefreshSecret,
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
            await this.authRepository.saveSessionAndRefreshToken(decodedRefresh_token.jti, session, newRefreshToken, logId);
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
