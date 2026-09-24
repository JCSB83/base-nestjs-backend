import { Inject, Injectable } from "@nestjs/common";
import { CreateUserDto } from "../infrastructure/dto/createUser.dto";
import { USER_REPOSITORY } from "../infrastructure/repositories/users.repository";
import type { IUsersRepository } from "../domain/repositories/users.repository.interface";
import { IUser } from "../domain/models/user.interface";

@Injectable()
export class CreateUserUseCase {
    constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUsersRepository) {}
    
    async execute(user: CreateUserDto, logId: string): Promise<string> {
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
            updatedAt: undefined,
            profileId: user.profileId
        };
        return await this.userRepository.create(iUser, logId);
    }
}