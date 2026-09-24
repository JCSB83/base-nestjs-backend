import { IRefreshToken } from "../models/refreshToken.interface";
import { ISession } from "../models/session.interface";
import { IUser } from "../models/user.interface";

export interface IAuthRepository {
    getRefreshTokenByToken(token: string, logId: string): Promise<IRefreshToken | undefined>
    getUserByUserId(userId: string, logId: string): Promise<IUser | undefined>;
    getUserByUsernameAndPassword(userName: string, password: string, logId: string): Promise<IUser | undefined>;
    getSessionByToken(token: string, logId: string): Promise<ISession | undefined>;
    saveSession(session: ISession, logId: string): Promise<string>;
    deleteSessionBySessionId(sessionId: string, logId: string): Promise<void>;
    saveRefreshToken(refreshToken: IRefreshToken, logId: string): Promise<string>;
}