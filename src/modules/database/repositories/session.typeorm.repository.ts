import { Injectable, Logger } from "@nestjs/common";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { Repository } from "typeorm";
import { SessionEntity } from "../entities/session.entity";
import { InjectRepository } from "@nestjs/typeorm";
import appConfig from "src/app.config";
import { DeleteResult } from "typeorm/browser";

@Injectable()
export class SessionTypeOrmRepository {
    constructor(
        @InjectRepository(SessionEntity, appConfig.postgres_connectionName) 
        private readonly sessionRepository: Repository<SessionEntity>
    ) {}

    async create(sessionEntity: SessionEntity, logId: string): Promise<string> {
        Logger.log(`[${logId}] SessionRepository.create`);
        try {
            const newSessionEntity = await this.sessionRepository.save(sessionEntity);
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

    async readByToken(token: string, logId: string): Promise<SessionEntity | undefined> {
        Logger.log(`[${logId}] SessionRepository.readByToken`);
        try {
            const session = await this.sessionRepository.findOne({ where: { token: token } });
            if (session === null) {
                return undefined;
            }
            return session;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the session.', error, logId);
        }
    }

    async delete(sessionId: string, logId: string): Promise<DeleteResult> {
        Logger.log(`[${logId}] SessionRepository.readByToken`);
        try {
            return await this.sessionRepository.delete(sessionId);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the session.', error, logId);
        }
    }
}