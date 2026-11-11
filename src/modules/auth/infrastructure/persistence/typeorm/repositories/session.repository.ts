import { Injectable, Logger } from "@nestjs/common";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { DataSource, EntityManager, Repository } from "typeorm";
import { SessionEntity } from "../entities/session.entity";
import { InjectDataSource } from "@nestjs/typeorm";
import { DeleteResult } from "typeorm/browser";
import { TypeOrmRepository } from "./typeorm.repository";
import { AUTH_CONNECTION_NAME } from "src/modules/auth/auth.constants";
import { ISessionRepository } from "src/modules/auth/domain/repositories/session.repository.inteface";
import { ISession } from "src/modules/auth/domain/models/session.interface";
import { IRefreshToken } from "src/modules/auth/domain/models/refreshToken.interface";
import { RefreshTokenEntity } from "../entities/refreshToken.entity";
import { RefreshTokenRepository } from "./refreshToken.repository";

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

@Injectable()
export class SessionRepository extends TypeOrmRepository implements ISessionRepository {
    private readonly sessionRepository: Repository<SessionEntity>;

    constructor(@InjectDataSource(AUTH_CONNECTION_NAME) dataSource: DataSource,
                private readonly refreshTokenRepository: RefreshTokenRepository) {
        super(dataSource);
        this.sessionRepository = dataSource.manager.getRepository(SessionEntity);
    }

    async getSessionById(sessionId: string, logId: string): Promise<ISession | undefined> {
        Logger.log(`[${logId}] SessionRepository.getSessionById`);
        try {
            const sessionEntity = await this.sessionRepository.findOne({ where: { sessionId: sessionId } });
            if (sessionEntity === null) {
                return undefined;
            }
            return {
                sessionId: sessionEntity.sessionId,
                userId: sessionEntity.userId,
                jti: sessionEntity.jti,
                expiresAt: sessionEntity.expiresAt
            };
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the session.', error, logId);
        }
    }

    async getSessionsByUserId(userId: string, logId: string): Promise<ISession[]> {
        Logger.log(`[${logId}] SessionRepository.getSessionsByUserId`);
        try {
            const sessionEntities =  await this.sessionRepository.find({ where: { userId } });    
            const sessions = new Array<ISession>();
            for (const sessionEntity of sessionEntities) {
                const session: ISession = {
                    sessionId: sessionEntity.sessionId,
                    userId: sessionEntity.userId,
                    jti: sessionEntity.jti,
                    expiresAt: sessionEntity.expiresAt
                };
                sessions.push(session);
            }
            return sessions;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while search sessions.', error, logId);
        }
    }

    async getSessionByJTI(jti: string, logId: string): Promise<ISession | undefined> {
        Logger.log(`[${logId}] SessionRepository.getSessionByJTI`);
        try {
            const sessionEntity = await this.sessionRepository.findOne({ where: { jti } });
            if (sessionEntity === null) {
                return undefined;
            }
            return {
                sessionId: sessionEntity.sessionId,
                userId: sessionEntity.userId,
                jti: sessionEntity.jti,
                expiresAt: sessionEntity.expiresAt
            };
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the session.', error, logId);
        }
    }

    async saveSessionAndRefreshToken(previousJti: string | undefined, session: ISession, refreshToken: IRefreshToken, logId: string): Promise<void> {
        const sessionEntity = new SessionEntity();
        sessionEntity.userId = session.userId;
        sessionEntity.jti = session.jti;
        sessionEntity.expiresAt = session.expiresAt;

        const refreshTokenEntity = new RefreshTokenEntity();
        refreshTokenEntity.userId = refreshToken.userId;
        refreshTokenEntity.jti = refreshToken.jti;
        refreshTokenEntity.expiresAt = refreshToken.expiresAt;

        const dataSource = this.getDataSource();
        await dataSource.transaction(async (manager) => {
            if (previousJti) {
                await this.deleteByJTI(previousJti, manager, logId);
                await this.refreshTokenRepository.deleteByJTI(previousJti, manager, logId);
            }
            await this.create(sessionEntity, manager, logId);
            await this.refreshTokenRepository.create(refreshTokenEntity, manager, logId);
        });
    } 
    
    async deleteExpiredSessions(logId: string): Promise<void> {
        Logger.log(`[${logId}] SessionRepository.deleteExpiredSessions`);
        try {
            await this.sessionRepository.createQueryBuilder()
                .delete()
                .from(SessionEntity)
                .where("expires_at <= now()")
                .execute();
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete expired sessions.', error, logId);
        }
    }

    async deleteSessionAndRefreshToken(jti: string, logId: string): Promise<void> {
        const dataSource = this.getDataSource();
        await dataSource.transaction(async (manager) => {
            await this.deleteByJTI(jti, manager, logId);
            await this.refreshTokenRepository.deleteByJTI(jti, manager, logId);
        });
    }

    async deleteSessionsAndRefreshTokens(userId: string, logId: string): Promise<void> {
        const dataSource = this.getDataSource();
        const sessionEntities = await this.searchByUserId(userId, logId);
        const refreshTokenEntities = await this.refreshTokenRepository.searchByUserId(userId, logId);
        await dataSource.transaction(async (manager) => {
            for(const sessionEntity of sessionEntities) {
                await this.delete(sessionEntity.sessionId, manager, logId);
            }
            for(const refreshTokenEntity of refreshTokenEntities) {
                await this.refreshTokenRepository.delete(refreshTokenEntity.refreshTokenId, manager, logId);
            }
        });
    }

    async deleteSessionBySessionId(sessionId: string, logId: string): Promise<void> {
        const dataSource = this.getDataSource();
        const sessionEntity = await this.readBySessionId(sessionId, logId);
        if (!sessionEntity) {
            return;
        }
        await dataSource.transaction(async (manager) => {
            await this.deleteByJTI(sessionEntity.jti, manager, logId);
            await this.refreshTokenRepository.deleteByJTI(sessionEntity.jti, manager, logId);
        });
    }

    private async deleteByJTI(jti: string, manager: EntityManager | undefined, logId: string): Promise<DeleteResult> {
        Logger.log(`[${logId}] SessionRepository.delete`);
        try {
            const repository = !manager ? this.sessionRepository : manager.getRepository(SessionEntity);
            return await repository.delete({ jti });
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the session.', error, logId);
        }
    }

    private async create(sessionEntity: SessionEntity, manager: EntityManager | undefined, logId: string): Promise<string> {
        Logger.log(`[${logId}] SessionRepository.create`);
        try {
            const repository = !manager ? this.sessionRepository : manager.getRepository(SessionEntity);
            const newSessionEntity = await repository.save(sessionEntity);
            Logger.log(`[${logId}] Session sessionId "${newSessionEntity.sessionId}" created for userId "${newSessionEntity.userId}"`);
            return newSessionEntity.sessionId;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to create the session.', error, logId);
        }
    }

    private async searchByUserId(userId: string, logId: string) {
        Logger.log(`[${logId}] SessionRepository.searchByUserId`);
        try {
            return await this.sessionRepository.find({ where: { userId } });
        } catch (error: any) {
            throw new RepositoryError('An error occurred while search sessions.', error, logId);
        }
    }

    private async delete(sessionId: string, manager: EntityManager | undefined, logId: string): Promise<DeleteResult> {
        Logger.log(`[${logId}] SessionRepository.delete`);
        try {
            const repository = !manager ? this.sessionRepository : manager.getRepository(SessionEntity);
            return await repository.delete(sessionId);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the session.', error, logId);
        }
    }

    private async readBySessionId(sessionId: string, logId: string): Promise<SessionEntity | undefined> {
        Logger.log(`[${logId}] SessionRepository.readBySessionId`);
        try {
            const session = await this.sessionRepository.findOne({ where: { sessionId: sessionId } });
            if (session === null) {
                return undefined;
            }
            return session;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the session.', error, logId);
        }
    }    
}