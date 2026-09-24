import { Inject, Injectable, Logger } from "@nestjs/common";
import { IUser } from "../domain/models/user.interface";
import { USER_REPOSITORY } from "../infrastructure/repositories/users.repository";
import type { IUsersRepository } from "../domain/repositories/users.repository.interface";

@Injectable()
export class SearchUserUseCase {
    constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUsersRepository) {}

    async execute(logId: string): Promise<IUser[]> {
        const users = await this.userRepository.search(logId);
        Logger.log(`[${logId}] ${users.length} users found`);
        return users;
    }
}