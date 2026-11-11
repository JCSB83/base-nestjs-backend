import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { UserEntity } from "../entities/user.entity";
import { DataSource, Repository } from "typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { TypeOrmRepository } from "./typeorm.repository";
import { AUTH_CONNECTION_NAME } from "src/modules/auth/auth.constants";
import { IUserRepository } from "src/modules/auth/domain/repositories/user.repository.interface";
import { OptionEntity } from "../entities/option.entity";
import { IUser } from "src/modules/auth/domain/models/user.interface";
import { OptionRepository } from "./option.repository";
import { Utils } from "../../../utils/utils";

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

@Injectable()
export class UserRepository extends TypeOrmRepository implements IUserRepository {
    private readonly userRepository: Repository<UserEntity>

    constructor(@InjectDataSource(AUTH_CONNECTION_NAME) dataSource: DataSource,
                private readonly optionRepository: OptionRepository) {
        super(dataSource);
        this.userRepository = dataSource.manager.getRepository(UserEntity);
    }

    async getUserByUserId(userId: string, logId: string): Promise<IUser | undefined> {
        Logger.log(`[${logId}] UserRepository.getUserByUserId`);
        try {
            const userEntity = await this.userRepository.findOne({ 
                where: { 
                    userId: userId 
                }, 
                relations: {
                    profile: {
                        profileOptions: true
                    }
                }
            });
            if (userEntity === null) {
                return undefined;
            }
            const options = await this.optionRepository.searchActive(logId);
            return this.mapToIUser(userEntity, options);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the user.', error, logId);
        }
    }
    
    async getUserByEmailAndPassword(email: string, password: string, logId: string): Promise<IUser | undefined> {
        Logger.log(`[${logId}] UserRepository.getUserByEmailAndPassword`);
        try {
            const passwordHash = await Utils.createHash(password);
            const userEntity = await this.userRepository.findOne({ 
                where: { 
                    email: email, 
                    password: passwordHash 
                },
                relations: {
                    profile: {
                        profileOptions: true
                    }
                }
            });
            if (userEntity === null) {
                return undefined;
            }
            const options = await this.optionRepository.searchActive(logId);
            return this.mapToIUser(userEntity, options);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the user.', error, logId);
        }
    }    

    async getActiveUserByUserId(userId: string, logId: string): Promise<IUser | undefined> {
        Logger.log(`[${logId}] UserRepository.getActiveUserByUserId`);
        try {
            const userEntity = await this.userRepository.findOne({ 
                where: { 
                    userId: userId,
                    isActive: true
                }, 
                relations: {
                    profile: {
                        profileOptions: true
                    }
                }
            });
            if (userEntity === null) {
                return undefined;
            }
            const options = await this.optionRepository.search(logId);
            return this.mapToIUser(userEntity, options);
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to get the user.', error, logId);
        }
    }

    private mapToIUser(userEntity: UserEntity, options: OptionEntity[]): IUser {
        const user: IUser = {
            userId: userEntity.userId,
            displayName: userEntity.displayName,
            firstName: userEntity.firstName,
            lastName: userEntity.lastName,
            email: userEntity.email,
            phone: userEntity.phone,
            isActive: userEntity.isActive,
            createdAt: userEntity.createdAt,
            updatedAt: userEntity.updatedAt,
            profileId: userEntity.profileId,
            permissions: new Array<string>()
        };
        for (const profileOption of userEntity.profile?.profileOptions ?? []) {
            const option = options.find(o => o.optionId === profileOption.optionId && o.isActive);
            if (!option) {
                continue;
            }
            user.permissions.push(option.code);
        }
        return user;
    }
}