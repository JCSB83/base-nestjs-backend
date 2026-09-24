import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AUTH_REPOSITORY } from "../infrastructure/repositories/auth.repository";
import type { IAuthRepository } from "../domain/repositories/auth.repository.interface";
import { LogoutDto } from "../infrastructure/dto/logout.dto";

@Injectable()
export class LogoutUseCase {
    constructor(
        private readonly jwtService: JwtService,
        @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository
    ) {}

    async execute(sessionId: string, logId: string): Promise<void> {
        try {
            await this.authRepository.deleteSessionBySessionId(sessionId, logId);
        } catch (error: any) {

        }
    }
}