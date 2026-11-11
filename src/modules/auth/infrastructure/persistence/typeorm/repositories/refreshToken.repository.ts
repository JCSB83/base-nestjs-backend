import { Injectable, Logger } from "@nestjs/common";
import { RefreshTokenEntity } from "../entities/refreshToken.entity";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, DeleteResult, EntityManager, Repository } from "typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { TypeOrmRepository } from "./typeorm.repository";
import { AUTH_CONNECTION_NAME } from "src/modules/auth/auth.constants";
import { IRefreshTokenRepository } from "src/modules/auth/domain/repositories/refreshToken.repository.interface";
import { IRefreshToken } from "src/modules/auth/domain/models/refreshToken.interface";

export const REFRESHTOKEN_REPOSITORY = Symbol('REFRESHTOKEN_REPOSITORY');

@Injectable()
export class RefreshTokenRepository extends TypeOrmRepository implements IRefreshTokenRepository {
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>

    constructor(@InjectDataSource(AUTH_CONNECTION_NAME) dataSource: DataSource) {
        super(dataSource);
        this.refreshTokenRepository = dataSource.manager.getRepository(RefreshTokenEntity);
    }

    async deleteExpiredRefreshTokens(logId?: string): Promise<void> {
        Logger.log(`[${logId}] RefreshTokenRepository.deleteExpiredTokens`);
        try {
            await this.refreshTokenRepository.createQueryBuilder()
                .delete()
                .from(RefreshTokenEntity)
                .where("expires_at <= now()")
                .execute();
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete expired refresh tokens', error, logId);
        }
    }    
    
    async getRefreshTokenByJTI(jti: string, logId: string): Promise<IRefreshToken | undefined> {
        Logger.log(`[${logId}] RefreshTokenRepository.getRefreshTokenByJTI`);
        try {
            const refreshToken = await this.refreshTokenRepository.findOne({ where: { jti } });
            if (refreshToken === null) {
                return undefined;
            }
            return {
                userId: refreshToken.userId,
                jti: refreshToken.jti,
                expiresAt: refreshToken.expiresAt
            }
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to obtain the refresh token', error, logId);
        }
    }
    
    async deleteByJTI(jti: string, manager: EntityManager | undefined, logId: string): Promise<DeleteResult> {
        Logger.log(`[${logId}] RefreshTokenRepository.delete`);
        try {
            const repository = !manager ? this.refreshTokenRepository : manager.getRepository(RefreshTokenEntity);
            return await repository.delete({ jti });
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the session', error, logId);
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
            throw new RepositoryError('An error occurred while trying to create the refresh token', error, logId);
        }
    }

    async searchByUserId(userId: string, logId: string) {
        Logger.log(`[${logId}] SessionRepository.searchByUserId`);
        try {
            return await this.refreshTokenRepository.find({ where: { userId } });
        } catch (error: any) {
            throw new RepositoryError('An error occurred while search refresh tokens', error, logId);
        }
    }

    async delete(sessionId: string, manager: EntityManager | undefined, logId: string): Promise<DeleteResult> {
        Logger.log(`[${logId}] SessionRepository.delete`);
        try {
            const repository = !manager ? this.refreshTokenRepository : manager.getRepository(RefreshTokenEntity);
            return await repository.delete(sessionId);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the refresh tokens', error, logId);
        }
    }
}