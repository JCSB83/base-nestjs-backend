import { Inject, Injectable } from "@nestjs/common";
import { AUTH_REPOSITORY } from "../infrastructure/repositories/auth.repository";
import type { IAuthRepository } from "../domain/repositories/auth.repository.interface";
import { UseCaseError } from "src/modules/shared/errors/usecase.error";
import { RepositoryError } from "src/modules/shared/errors/repository.error";

@Injectable()
export class LogoutUseCase {
    constructor(
        @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository
    ) {}

    async execute(sessionId: string, logId: string): Promise<void> {
        try {
            const session = await this.authRepository.getSessionById(sessionId, logId);
            if (!session) {
                throw new UseCaseError('', undefined, logId);
            }
            await this.authRepository.deleteSessionAndRefreshToken(session.jti, logId);
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