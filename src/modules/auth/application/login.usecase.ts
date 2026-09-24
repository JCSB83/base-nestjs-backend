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
                throw new UseCaseError('User not found', undefined, logId);
            }
            Logger.log(`[${logId}] User "${user.userName}" found`);

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
            const session: ISession = {
                sessionId: undefined,
                userId: user.userId,
                token: strAccessToken,
                expiresAt: new Date(decodedAccessToken.exp * 1000)
            };
            await this.authRepository.saveSession(session, logId);

            const refreshToken: IRefreshToken = {
                userId: user.userId,
                token: strRefreshToken,
                expiresAt: new Date(decodedRefreshToken.exp * 1000)
            }
            await this.authRepository.saveRefreshToken(refreshToken, logId);

            const accessDto = new AccessDto();
            accessDto.accessToken = strAccessToken;
            accessDto.refreshToken = strRefreshToken;
            
            Logger.log(`[${logId}] Login successfully for userId "${user.userId}"`);
            return accessDto;      
        } catch (error: any) {
            if(error instanceof UseCaseError) {
                throw error;
            }
            if(error instanceof RepositoryError) {
                throw error;
            }
            throw new UseCaseError('', error, logId);            
        }
    }
}
