import { SessionTypeOrmRepository } from "src/modules/database/repositories/session.typeorm.repository";
import { IRefreshToken } from "../../domain/models/refreshToken.interface";
import { ISession } from "../../domain/models/session.interface";
import { IUser } from "../../domain/models/user.interface";
import { IAuthRepository } from "../../domain/repositories/auth.repository.interface";
import { Injectable } from "@nestjs/common";
import { SessionEntity } from "src/modules/database/entities/session.entity";
import { UserTypeOrmRepository } from "src/modules/database/repositories/user.typeorm.repository";
import { RefreshTokenTypeOrmRepository } from "src/modules/database/repositories/refreshToken.typeorm.repository";
import { RefreshTokenEntity } from "src/modules/database/entities/refreshToken.entity";
import { UserEntity } from "src/modules/database/entities/user.entity";
import { OptionEntity } from "src/modules/database/entities/option.entity";
import { OptionTypeOrmRepository } from "src/modules/database/repositories/option.typeorm.repository";

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

@Injectable()
export class AuthRepository implements IAuthRepository {
    constructor(private readonly sessionRepository: SessionTypeOrmRepository,
                private readonly userRepository: UserTypeOrmRepository,
                private readonly refreshTokenRepository: RefreshTokenTypeOrmRepository,
                private readonly optionRepository: OptionTypeOrmRepository) {}

    async getRefreshTokenByToken(token: string, logId: string): Promise<IRefreshToken | undefined> {
        const refreshTokenEntity = await this.refreshTokenRepository.readByToken(token, logId);
        if (!refreshTokenEntity) {
            return undefined;
        }
        return {
            userId: refreshTokenEntity.userId,
            token: refreshTokenEntity.token,
            expiresAt: refreshTokenEntity.expiresAt
        }
    }

    async getUserByUserId(userId: string, logId: string): Promise<IUser | undefined> {
        const userEntity = await this.userRepository.readByUserId(userId, logId);
        if (!userEntity) {
            return undefined;
        }
        const options = await this.optionRepository.search(logId);
        return this.mapToIUser(userEntity, options);
    }

    async getUserByUsernameAndPassword(userName: string, password: string, logId: string): Promise<IUser | undefined> {
        const userEntity = await this.userRepository.readByUsernameAndPassword(userName, password, logId);
        if (!userEntity) {
            return undefined;
        }
        const options = await this.optionRepository.search(logId);
        return this.mapToIUser(userEntity, options);
    }

    private mapToIUser(userEntity: UserEntity, options: OptionEntity[]): IUser {
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

    async getSessionByToken(token: string, logId: string): Promise<ISession | undefined> {
        const sessionEntity = await this.sessionRepository.readByToken(token, logId);
        if (!sessionEntity) {
            return undefined;
        }
        return {
            sessionId: sessionEntity.sessionId,
            userId: sessionEntity.userId,
            token: sessionEntity.token,
            expiresAt: sessionEntity.expiresAt
        };
    }

    async deleteSessionBySessionId(sessionId: string, logId: string): Promise<void> {
        const sessionEntity = await this.sessionRepository.readBySessionId(sessionId, logId);
        if(!sessionEntity) {
            throw new Error();
        }
        await this.sessionRepository.delete(sessionEntity.sessionId, logId);
    }

    async saveSession(session: ISession, logId: string): Promise<string> {
        const sessionEntity = new SessionEntity();
        sessionEntity.userId = session.userId;
        sessionEntity.token = session.token;
        sessionEntity.expiresAt = session.expiresAt;
        return await this.sessionRepository.create(sessionEntity, logId);
    }

    async saveRefreshToken(refreshToken: IRefreshToken, logId: string): Promise<string> {
        const refreshTokenEntity = new RefreshTokenEntity();
        refreshTokenEntity.userId = refreshToken.userId;
        refreshTokenEntity.token = refreshToken.token;
        refreshTokenEntity.expiresAt = refreshToken.expiresAt;
        return await this.refreshTokenRepository.create(refreshTokenEntity, logId);
    }
}