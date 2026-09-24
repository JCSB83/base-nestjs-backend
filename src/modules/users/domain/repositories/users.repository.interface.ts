import { CreateUserDto } from "../../infrastructure/dto/createUser.dto";
import { IUser } from "../models/user.interface";

export interface IUsersRepository {
    create(user: IUser, logId: string): Promise<string>;
    readByUserId(userId: string, logId: string): Promise<IUser | undefined>;
    update(user: IUser, changePassword: boolean, logId: string): Promise<void>;
    delete(userId: string, logId: string): Promise<void>;
    search(logId: string): Promise<Array<IUser>>;
}