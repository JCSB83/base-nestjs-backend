import { Injectable, Logger } from "@nestjs/common";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { DataSource, EntityManager, Repository } from "typeorm";
import { SessionEntity } from "../entities/session.entity";
import { InjectDataSource } from "@nestjs/typeorm";
import appConfig from "src/app.config";
import { DeleteResult } from "typeorm/browser";
import { TypeOrmRepository } from "./typeorm.repository";

@Injectable()
export class SessionTypeOrmRepository extends TypeOrmRepository {
    private readonly sessionRepository: Repository<SessionEntity>

    constructor(@InjectDataSource(appConfig.postgres_connectionName) dataSource: DataSource) {
        super(dataSource);
        this.sessionRepository = dataSource.manager.getRepository(SessionEntity);
    }

    async create(sessionEntity: SessionEntity, manager: EntityManager | undefined, logId: string): Promise<string> {
        Logger.log(`[${logId}] SessionRepository.create`);
        try {
            const repository = !manager ? this.sessionRepository : manager.getRepository(SessionEntity);
            const newSessionEntity = await repository.save(sessionEntity);
            Logger.log(`[${logId}] Session sessionId "${newSessionEntity.sessionId}" created for userId "${newSessionEntity.userId}"`);
            return newSessionEntity.sessionId;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to create the session.', error);
        }
    }
    
    async readBySessionId(sessionId: string, logId: string): Promise<SessionEntity | undefined> {
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

    async readByJTI(jti: string, logId: string): Promise<SessionEntity | undefined> {
        Logger.log(`[${logId}] SessionRepository.readByToken`);
        try {
            const session = await this.sessionRepository.findOne({ where: { jti } });
            if (session === null) {
                return undefined;
            }
            return session;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the session.', error, logId);
        }
    }

    async delete(sessionId: string, logId: string): Promise<DeleteResult> {
        Logger.log(`[${logId}] SessionRepository.delete`);
        try {
            return await this.sessionRepository.delete(sessionId);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the session.', error, logId);
        }
    }

    async deleteByJTI(jti: string, manager: EntityManager | undefined, logId: string): Promise<DeleteResult> {
        Logger.log(`[${logId}] SessionRepository.delete`);
        try {
            const repository = !manager ? this.sessionRepository : manager.getRepository(SessionEntity);
            return await repository.delete({ jti });
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the session.', error, logId);
        }
    }
}