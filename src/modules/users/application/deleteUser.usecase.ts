import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY } from "../infrastructure/repositories/users.repository";
import type { IUsersRepository } from "../domain/repositories/users.repository.interface";

@Injectable()
export class DeleteUserUseCase {
    constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUsersRepository) {}
    
    async execute(userId: string, logId: string): Promise<void> {
        await this.userRepository.delete(userId, logId);
    }
}