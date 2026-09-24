import { Inject, Injectable } from "@nestjs/common";
import { UpdateUserDto } from "../infrastructure/dto/updateUser.dto";
import { USER_REPOSITORY } from "../infrastructure/repositories/users.repository";
import type { IUsersRepository } from "../domain/repositories/users.repository.interface";
import { IUser } from "../domain/models/user.interface";

@Injectable()
export class UpdateUserUseCase {
    constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUsersRepository) {}
    
    async execute(user: UpdateUserDto, logId: string): Promise<void> {
        const iUser: IUser = {
            userId: undefined,
            userName: user.userName,
            password: user.password,
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            isActive: user.isActive,
            createdAt: new Date(),
            updatedAt: new Date(),
            profileId: user.profileId
        };
        await this.userRepository.update(iUser, user.changePassword, logId);
    }
}