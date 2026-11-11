import { IRefreshToken } from "../models/refreshToken.interface";
import { ISession } from "../models/session.interface";

export interface ISessionRepository {
    getSessionById(sessionId: string, logId: string): Promise<ISession | undefined>;
    getSessionsByUserId(userId: string, logId: string): Promise<ISession[]>;
    getSessionByJTI(token: string, logId: string): Promise<ISession | undefined>;
    saveSessionAndRefreshToken(previus_jti: string | undefined, session: ISession, refreshToken: IRefreshToken, logId: string): Promise<void>;
    deleteExpiredSessions(logId: string): Promise<void>;
    deleteSessionAndRefreshToken(jti: string, logId: string): Promise<void>;
    deleteSessionsAndRefreshTokens(userId: string, logId: string): Promise<void>;
    deleteSessionBySessionId(sessionId: string, logId: string): Promise<void>;
}