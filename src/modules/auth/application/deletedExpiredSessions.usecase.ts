import { Inject, Injectable } from "@nestjs/common";
import { AUTH_REPOSITORY } from "../infrastructure/repositories/auth.repository";
import type { IAuthRepository } from "../domain/repositories/auth.repository.interface";

@Injectable()
export class DeleteExpiredSessionsUseCase {
    constructor(@Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository) {}
    
    async execute(logId: string): Promise<void> {
        await this.authRepository.deleteExpiredSessions(logId);
    }
}