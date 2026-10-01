import { IRefreshToken } from "../models/refreshToken.interface";
import { ISession } from "../models/session.interface";
import { IUser } from "../models/user.interface";

export interface IAuthRepository {
    getRefreshTokenByJTI(token: string, logId: string): Promise<IRefreshToken | undefined>
    getUserByUserId(userId: string, logId: string): Promise<IUser | undefined>;
    getActiveUserByUserId(userId: string, logId: string): Promise<IUser | undefined>;
    getUserByUsernameAndPassword(userName: string, password: string, logId: string): Promise<IUser | undefined>;
    getSessionByJTI(token: string, logId: string): Promise<ISession | undefined>;
    getSessionById(sessionId: string, logId: string): Promise<ISession | undefined>;
    saveSession(session: ISession, logId: string): Promise<string>;
    deleteSessionAndRefreshToken(jti: string, logId: string): Promise<void>;
    saveRefreshToken(refreshToken: IRefreshToken, logId: string): Promise<string>;
    saveSessionAndRefreshToken(previus_jti: string | undefined, session: ISession, refreshToken: IRefreshToken, logId: string): Promise<void>;
}