import { Inject, Injectable } from "@nestjs/common";
import { IUser } from "../domain/models/user.interface";
import { USER_REPOSITORY } from "../infrastructure/repositories/users.repository";
import type { IUsersRepository } from "../domain/repositories/users.repository.interface";

@Injectable()
export class readUserUseCase {
    constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUsersRepository) {}

    async execute(userId: string, logId: string): Promise<IUser | undefined> {
        return await this.userRepository.readByUserId(userId, logId);
    }
}