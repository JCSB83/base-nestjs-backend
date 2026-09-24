export interface IUser {
    userId: string | undefined;
    userName: string;
    password: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date | undefined;
    profileId: string;
    permissions?: string[];
}