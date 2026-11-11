import { Inject, Injectable } from '@nestjs/common';
import { SESSION_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/session.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';

@Injectable()
export class DeleteExpiredSessionsUseCase {
    constructor(@Inject(SESSION_REPOSITORY) private readonly sessionRepository: ISessionRepository) {}
    
    async execute(logId: string): Promise<void> {
        await this.sessionRepository.deleteExpiredSessions(logId);
    }
}