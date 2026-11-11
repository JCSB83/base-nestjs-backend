import { Expose } from "class-transformer";
import { IUser } from "../../domain/models/user.interface";

export class UserDto implements IUser {
    @Expose()
    userId!: string;
    @Expose()
    displayName!: string;
    @Expose()
    firstName!: string;
    @Expose()
    lastName?: string;
    @Expose()
    email!: string;
    @Expose()
    phone!: string;
    @Expose()
    isActive!: boolean;
    @Expose()
    createdAt!: Date;
    @Expose()
    updatedAt!: Date | undefined;
    @Expose()
    profileId!: string;
    @Expose()
    permissions!: string[];
}