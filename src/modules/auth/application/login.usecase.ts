import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { RepositoryError } from 'src/modules/shared/errors/repository.error';
import { JwtService } from '@nestjs/jwt';
import appConfig from 'src/app.config';
import { AUTH_REPOSITORY } from '../infrastructure/repositories/auth.repository';
import type { IAuthRepository } from '../domain/repositories/auth.repository.interface';
import { ISession } from '../domain/models/session.interface';
import { IRefreshToken } from '../domain/models/refreshToken.interface';
import { AccessDto } from '../infrastructure/dto/access.dto';
import { LoginDto } from '../infrastructure/dto/login.dto';
import { Utils } from 'src/modules/shared/utils/utils';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';

@Injectable()
export class LoginUseCase {
    constructor(
        private readonly jwtService: JwtService,
        @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository
    ) {}

    async execute(loginDto: LoginDto, logId: string): Promise<AccessDto> {
        Logger.log(`[${logId}] LoginUseCase.execute`);
        try {
            const user = await this.authRepository.getUserByUsernameAndPassword(loginDto.userName, loginDto.password, logId);
            if(!user) {
                throw new UseCaseError('User not found', ErrorLevel.Validation, undefined, logId);
            }
            if (!user.isActive) {
                throw new UseCaseError('User is not active', ErrorLevel.Validation, undefined, logId);
            }
            const jti = Utils.generateJti();
            const payload = { username: user.userName, sub: user.userId, jti };
            const strAccessToken = this.jwtService.sign(payload, {
                expiresIn: appConfig.jwtExpiresIn,
                secret: appConfig.jwtSecret
            });
            const refreshPayload = { username: user.userName, sub: user.userId, jti };
            const strRefreshToken = this.jwtService.sign(refreshPayload, {
                expiresIn: appConfig.jwtRefreshExpiresIn,
                secret: appConfig.jwtRefreshSecret
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
            await this.authRepository.saveSessionAndRefreshToken(undefined, session, refreshToken, logId);
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
