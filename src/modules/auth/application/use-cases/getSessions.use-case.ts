import { Inject, Injectable } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { SESSION_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/session.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';
import { ISession } from '../../domain/models/session.interface';

@Injectable()
export class GetSessionsUseCase {
    constructor(@Inject(SESSION_REPOSITORY) private readonly sessionRepository: ISessionRepository) {}

    async execute(userId: string, logId: string): Promise<ISession[]> {
        try {
            const sessions = await this.sessionRepository.getSessionsByUserId(userId, logId);
            return sessions;
        } catch (error: any) {
            if(error instanceof UseCaseError) {
                throw error;
            }
            throw new UseCaseError('Internal server error', ErrorLevel.Unknown, error, logId);
        }
    }
}