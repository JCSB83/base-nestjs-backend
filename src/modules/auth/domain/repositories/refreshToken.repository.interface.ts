import { IRefreshToken } from "../models/refreshToken.interface";

export interface IRefreshTokenRepository {
    deleteExpiredRefreshTokens(logId: string): Promise<void>;
    getRefreshTokenByJTI(jti: string, logId: string): Promise<IRefreshToken | undefined>;
}