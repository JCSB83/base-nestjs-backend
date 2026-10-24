declare namespace Express {
    export interface Request {
        logId: string;
        logData: boolean;
    }
}