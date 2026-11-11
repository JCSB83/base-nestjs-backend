export interface IUser {
    userId: string;
    displayName: string;
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date | undefined;
    profileId: string;
    permissions: string[];
}