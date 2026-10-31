declare namespace Express {
    export interface Request {
        logId: string;
        logData: boolean;
        userId: string;
        user: any;
        sessionId: string;
    }
}