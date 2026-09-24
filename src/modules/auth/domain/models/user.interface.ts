export interface IUser {
    userId: string;
    userName: string;
    password: string;
    firstName: string;
    middleName?: string | undefined;
    lastName: string;
    email: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date | undefined;
    profileId: string;
    permissions?: string[];
}