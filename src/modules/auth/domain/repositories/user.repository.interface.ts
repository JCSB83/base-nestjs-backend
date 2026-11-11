import { IUser } from "../models/user.interface";

export interface IUserRepository {
    getUserByUserId(userId: string, logId: string): Promise<IUser | undefined>;
    getUserByEmailAndPassword(email: string, password: string, logId: string): Promise<IUser | undefined>;
    getActiveUserByUserId(userId: string, logId: string): Promise<IUser | undefined>;
}