import { Inject, Injectable } from '@nestjs/common';
import { REFRESHTOKEN_REPOSITORY } from '../../infrastructure/persistence/typeorm/repositories/refreshToken.repository';
import type { IRefreshTokenRepository } from '../../domain/repositories/refreshToken.repository.interface';

@Injectable()
export class DeleteExpiredRefreshTokensUseCase {
    constructor(@Inject(REFRESHTOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository) {}
    
    async execute(logId: string): Promise<void> {
        await this.refreshTokenRepository.deleteExpiredRefreshTokens(logId);
    }
}