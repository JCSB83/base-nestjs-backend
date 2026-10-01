import { Injectable, Logger } from "@nestjs/common";
import { RefreshTokenEntity } from "../entities/refreshToken.entity";
import { InjectDataSource } from "@nestjs/typeorm";
import appConfig from "src/app.config";
import { DataSource, DeleteResult, EntityManager, Repository } from "typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { TypeOrmRepository } from "./typeorm.repository";

@Injectable()
export class RefreshTokenTypeOrmRepository extends TypeOrmRepository {
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>

    constructor(@InjectDataSource(appConfig.postgres_connectionName) dataSource: DataSource) {
        super(dataSource);
        this.refreshTokenRepository = dataSource.manager.getRepository(RefreshTokenEntity);
    }
    
    async readByJTI(jti: string, logId: string): Promise<RefreshTokenEntity | undefined> {
        Logger.log(`[${logId}] RefreshTokenRepository.readByJti`);
        try {
            const refreshToken = await this.refreshTokenRepository.findOne({ where: { jti } });
            if (refreshToken === null) {
                return undefined;
            }
            return refreshToken;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to obtain the refresh token.', error, logId);
        }
    }
    
    async create(refreshToken: RefreshTokenEntity, manager: EntityManager | undefined, logId: string): Promise<string> {
        Logger.log(`[${logId}] RefreshTokenRepository.create`);
        try {
            const repository = !manager ? this.refreshTokenRepository : manager.getRepository(RefreshTokenEntity);
            const newRefreshToken = await repository.save(refreshToken);
            Logger.log(`[${logId}] RefreshToken refreshTokenId "${newRefreshToken.refreshTokenId}" created for userId "${newRefreshToken.userId}"`);
            return newRefreshToken.refreshTokenId;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to create the refresh token.', error, logId);
        }
    }

    async deleteByJTI(jti: string, manager: EntityManager | undefined, logId: string): Promise<DeleteResult> {
        Logger.log(`[${logId}] RefreshTokenRepository.delete`);
        try {
            const repository = !manager ? this.refreshTokenRepository : manager.getRepository(RefreshTokenEntity);
            return await repository.delete({ jti });
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the session.', error, logId);
        }
    }
}