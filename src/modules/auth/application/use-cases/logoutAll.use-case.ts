import { Inject, Injectable } from '@nestjs/common';
import { UseCaseError } from 'src/modules/shared/errors/usecase.error';
import { ErrorLevel } from 'src/modules/shared/errors/errorLevel.enum';
import { SESSION_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/session.repository';
import type { ISessionRepository } from '../../domain/repositories/session.repository.inteface';

@Injectable()
export class LogoutAllUseCase {
    constructor(
        @Inject(SESSION_REPOSITORY) private readonly authRepository: ISessionRepository
    ) {}

    async execute(sessionId: string, logId: string): Promise<void> {
        try {
            const session = await this.authRepository.getSessionById(sessionId, logId);
            if (!session) {
                throw new UseCaseError('Session not found', ErrorLevel.Validation, undefined, logId);
            }
            await this.authRepository.deleteSessionsAndRefreshTokens(session.userId, logId);
        } catch (error: any) {
            if(error instanceof UseCaseError) {
                throw error;
            }
            throw new UseCaseError('Internal server error', ErrorLevel.Unknown, error, logId);
        }
    }
}