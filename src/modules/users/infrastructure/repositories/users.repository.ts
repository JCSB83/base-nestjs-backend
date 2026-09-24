import { Injectable, Logger } from "@nestjs/common";
import { IUsersRepository } from "../../domain/repositories/users.repository.interface";
import { UserEntity } from "src/modules/database/entities/user.entity";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { Utils } from "src/modules/shared/utils/utils";
import { IUser } from "../../domain/models/user.interface";
import { UserTypeOrmRepository } from "src/modules/database/repositories/user.typeorm.repository";
import { ProfileTypeOrmRepository } from "src/modules/database/repositories/profile.typeorm.repository";
import { OptionEntity } from "src/modules/database/entities/option.entity";
import { OptionTypeOrmRepository } from "src/modules/database/repositories/option.typeorm.repository";

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Injectable()
export class UsersRepository implements IUsersRepository {
    constructor(private readonly userRepository: UserTypeOrmRepository,
                private readonly profileRepository: ProfileTypeOrmRepository,
                private readonly optionRepository: OptionTypeOrmRepository) {}

    async create(user: IUser, logId: string): Promise<string> {
        Logger.log(`[${logId}] UserRepository.create`);
        try {
            const exists = await this.profileRepository.exists(user.profileId, true, logId);
            if (!exists) {
                throw new RepositoryError('Profile not found.', undefined, logId);
            }
            const userEntity = this.mapToUserEntity(user);
            userEntity.password = await Utils.createHash(user.password);
            return await this.userRepository.create(userEntity, logId);
        } catch (error: any) {
            if (error instanceof RepositoryError) {
                throw error;
            }
            throw new RepositoryError('An error occurred while trying to create the user.', error, logId);
        }
    }

    async readByUserId(userId: string, logId: string): Promise<IUser | undefined> {
        Logger.debug(`[${logId}] UsersRepository.readByUserId`);
        try {
            const userEntity = await this.userRepository.readByUserId(userId, logId);
            if (!userEntity) {
                return undefined;
            }
            const options = await this.optionRepository.search(logId);
            return this.mapToUser(userEntity, options);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the user.', error, logId);
        }
    }

    async update(user: IUser, changePassword: boolean, logId: string): Promise<void> {
        Logger.debug(`[${logId}] UsersRepository.update`);
        try {
            const userEntity = this.mapToUserEntity(user);
            await this.userRepository.update(userEntity, changePassword, logId);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the user.', error, logId);
        }
    }

    async delete(userId: string, logId: string): Promise<void> {
        Logger.debug(`[${logId}] UsersRepository.delete`);
        try {
            await this.userRepository.delete(userId, logId);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the user.', error, logId);
        }
    }

    async search(logId: string): Promise<Array<IUser>> {
        Logger.log(`[${logId}] UsersRepository.search`);
        try {
            const userEntities = await this.userRepository.search(logId);
            const iUsers = new Array<IUser>();
            for (const userEntity of userEntities) {
                const iUser = this.mapToUser(userEntity, undefined);
                iUsers.push(iUser);
            }
            return iUsers;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to delete the user.', error, logId);
        }
    }

    private mapToUser(userEntity: UserEntity, options: OptionEntity[] | undefined): IUser {
        const user = {
            userId: userEntity.userId,
            userName: userEntity.userName,
            password: userEntity.password,
            firstName: userEntity.firstName,
            middleName: userEntity.middleName,
            lastName: userEntity.lastName,
            email: userEntity.email,
            phone: userEntity.phone,
            isActive: userEntity.isActive,
            createdAt: userEntity.createdAt,
            updatedAt: userEntity.updatedAt,
            profileId: userEntity.profileId,
            permissions: new Array<string>()
        }
        if(options && options.length > 0) {
            for (const profileOption of userEntity.profile?.profileOptions ?? []) {
                const option = options.find(o => o.optionId === profileOption.optionId && o.isActive);
                if (!option) {
                    continue;
                }
                user.permissions.push(option.code);
            }
        }
        return user;
    }

    private mapToUserEntity(user: IUser): UserEntity {
        const userEntity = new UserEntity();
        if (user.userId) {
            userEntity.userId = user.userId;
        }
        userEntity.userName = user.userName;
        userEntity.password = user.password;
        userEntity.firstName = user.firstName;
        userEntity.middleName = user.middleName;
        userEntity.lastName = user.lastName;
        userEntity.email = user.email;
        userEntity.phone = user.phone;
        userEntity.isActive = user.isActive;
        userEntity.createdAt = user.createdAt;
        userEntity.updatedAt = user.updatedAt;
        userEntity.profileId = user.profileId;
        return userEntity;
    }
}