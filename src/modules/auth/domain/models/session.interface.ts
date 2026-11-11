export interface ISession {
    sessionId?: string;
    userId: string;
    jti: string;
    expiresAt: Date;
}
