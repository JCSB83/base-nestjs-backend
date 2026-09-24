import { Injectable, Logger } from "@nestjs/common";
import { RefreshTokenEntity } from "../entities/refreshToken.entity";
import { InjectRepository } from "@nestjs/typeorm";
import appConfig from "src/app.config";
import { Repository } from "typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";

@Injectable()
export class RefreshTokenTypeOrmRepository {
    constructor(
        @InjectRepository(RefreshTokenEntity, appConfig.postgres_connectionName)
        private refreshTokenRepository: Repository<RefreshTokenEntity>
    ) {}
    
    async readByToken(token: string, logId: string): Promise<RefreshTokenEntity | undefined> {
        Logger.log(`[${logId}] RefreshTokenRepository.readByToken`);
        try {
            const refreshToken = await this.refreshTokenRepository.findOne({ where: { token: token } });
            if (refreshToken === null) {
                return undefined;
            }
            return refreshToken;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to obtain the refresh token.', error, logId);
        }
    }
    
    async create(refreshToken: RefreshTokenEntity, logId: string): Promise<string> {
        Logger.log(`[${logId}] RefreshTokenRepository.create`);
        try {
            const newRefreshToken = await this.refreshTokenRepository.save(refreshToken);
            Logger.log(`[${logId}] RefreshToken refreshTokenId "${newRefreshToken.refreshTokenId}" created for userId "${newRefreshToken.userId}"`);
            return newRefreshToken.refreshTokenId;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to create the refresh token.', error, logId);
        }
    }
}