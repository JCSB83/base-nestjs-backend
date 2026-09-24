export interface ISession {
    sessionId?: string;
    userId: string;
    token: string;
    expiresAt: Date;
}
