import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserEntity } from "../entities/user.entity";
import appConfig from "src/app.config";
import { Repository } from "typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { Utils } from "src/modules/shared/utils/utils";
import { ProfileTypeOrmRepository } from "./profile.typeorm.repository";

@Injectable()
export class UserTypeOrmRepository{
    constructor(
        @InjectRepository(UserEntity, appConfig.postgres_connectionName) 
        private readonly userRepository: Repository<UserEntity>,
        private readonly profileRepository: ProfileTypeOrmRepository
    ) {}

    async create(user: UserEntity, logId: string): Promise<string> {
        Logger.log(`[${logId}] UserRepository.create`);
        try {
            const exists = await this.profileRepository.exists(user.profileId, true, logId);
            if (!exists) {
                throw new RepositoryError('Profile not found.', undefined, logId);
            }
            user.password = await Utils.createHash(user.password); 
            await this.userRepository.save(user);
            return user.userId;
        } catch (error: any) {
            if (error instanceof RepositoryError) {
                throw error;
            }
            throw new RepositoryError('An error occurred while trying to create the user.', error, logId);
        }
    }

    async readByUserId(userId: string, logId: string): Promise<UserEntity | undefined> {
        Logger.log(`[${logId}] UserRepository.readByUserId`);
        try {
            const user = await this.userRepository.findOne({ 
                where: { 
                    userId: userId 
                }, 
                relations: {
                    profile: {
                        profileOptions: true
                    }
                }
            });
            if (user === null) {
                return undefined;
            }
            return user;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the user.', error, logId);
        }
    }

    async readByUsernameAndPassword(userName: string, password: string, logId: string): Promise<UserEntity | undefined> {
        Logger.log(`[${logId}] UserRepository.readByUserNameAndPassword`);
        try {
            const passwordHash = await Utils.createHash(password);
            const user = await this.userRepository.findOne({ 
                where: { 
                    userName: userName, 
                    password: passwordHash 
                },
                relations: {
                    profile: {
                        profileOptions: true
                    }
                }
            });
            if (user === null) {
                return undefined;
            }
            return user;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the user.', error, logId);
        }
    }

    async update(user: UserEntity, changePassword: boolean, logId: string): Promise<void> {
        Logger.log(`[${logId}] UserRepository.update`);
        try {
            const auxUser = await this.readByUserId(user.userId, logId);
            if (!auxUser) {
                throw new RepositoryError('User not found.', undefined, logId);
            }
            const exists = await this.profileRepository.exists(user.profileId, true, logId);
            if (!exists) {
                throw new RepositoryError('Profile not found.', undefined, logId);
            }
            user.updatedAt = new Date();
            if (changePassword) {
                user.password = await Utils.createHash(user.password);
                await this.userRepository.save(user);
            } else {
                await this.userRepository
                .createQueryBuilder()
                .update(UserEntity)
                .set({
                    firstName: user.firstName,
                    middleName: user.middleName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    isActive: user.isActive,
                    updatedAt: user.updatedAt,
                    profileId: user.profileId,
                })
                .where({ userId: user.userId })
                .execute();
            }
        } catch (error: any) {
            if (error instanceof RepositoryError) {
                throw error;
            }
            throw new RepositoryError('An error occurred while trying to update the user.', error, logId);
        }
    }
    
    async delete(userId: string, logId: string): Promise<void> {
        Logger.log(`[${logId}] UserRepository.delete`);
        try {
            const exists = await this.userRepository.exists({ where: { userId: userId } });
            if (!exists) {
                throw new RepositoryError('User not found.', undefined, logId);
            }
            await this.userRepository.delete(userId);
        } catch (error: any) {
            if (error instanceof RepositoryError) {
                throw error;
            }
            throw new RepositoryError('An error occurred while trying to delete the user.', error, logId);
        }
    }

    async search(logId: string): Promise<Array<UserEntity>> {
        Logger.log(`[${logId}] UserRepository.search`);
        try {
            const users = await this.userRepository.find();
            return users;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to search for users.', error, logId);
        }
    }
}