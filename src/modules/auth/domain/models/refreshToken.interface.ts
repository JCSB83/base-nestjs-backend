export interface IRefreshToken {
    userId: string;
    jti: string;
    expiresAt: Date;
}