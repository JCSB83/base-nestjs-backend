import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { JwtService } from '@nestjs/jwt';
import appConfig from 'src/app.config';
import { RepositoryError } from 'src/modules/shared/errors/repository.error';
import { SessionEntity } from 'src/modules/database/entities/session.entity';
import { AUTH_REPOSITORY } from '../infrastructure/repositories/auth.repository';
import type { IAuthRepository } from '../domain/repositories/auth.repository.interface';
import { AccessDto } from '../infrastructure/dto/access.dto';
import { IRefreshToken } from '../domain/models/refreshToken.interface';

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
            const refreshToken = await this.authRepository.getRefreshTokenByToken(refresh_token, logId);
            if (!refreshToken) {
                throw new UseCaseError('');
            }
            Logger.log(`[${logId}] RefreshToken found for userId "${refreshToken.userId}"`);
            const user = await this.authRepository.getUserByUserId(refreshToken.userId, logId);
            if (!user) {
                throw new UseCaseError('');
            }
            const payload = { username: user.userName, sub: user.userId };
            const strAccessToken = this.jwtService.sign(payload, {
                expiresIn: appConfig.jwtExpiresIn,
                secret: appConfig.jwtSecret
            });
            const decodedAccessToken = this.jwtService.decode(strAccessToken);
            const strRefreshToken = this.jwtService.sign(payload, {
                expiresIn: appConfig.jwtRefreshExpiresIn,
                secret: appConfig.jwtRefreshSecret
            });
            const decodedRefreshToken = this.jwtService.decode(strRefreshToken);
            const sessionEntity = new SessionEntity();
            sessionEntity.userId = user.userId;
            sessionEntity.token = strAccessToken;
            sessionEntity.expiresAt = new Date(decodedAccessToken.exp * 1000);
                        
            await this.authRepository.saveSession(sessionEntity, logId);
            const newRefreshToken: IRefreshToken = {
                userId: user.userId,
                token: strRefreshToken,
                expiresAt: new Date(decodedRefreshToken.exp * 1000)
            };
            await this.authRepository.saveRefreshToken(newRefreshToken, logId);

            const accessDto = new AccessDto();
            accessDto.accessToken = strAccessToken;
            accessDto.refreshToken = strRefreshToken;
            Logger.log(`[${logId}] Session refreshed successfully for userId "${user.userId}"`);
            return accessDto;
        } catch (error: any) {
            if(error instanceof UseCaseError) {
                throw error;
            }             
            if (error instanceof RepositoryError) {
                throw new UseCaseError('', error);
            }
            throw new UseCaseError('', error);
        }
    }
}
