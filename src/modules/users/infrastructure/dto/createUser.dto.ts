import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    userName!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    password!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName!: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    middleName?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    lastName!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(320)
    @IsEmail({})
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(15)
    phone!: string;

    @IsBoolean()
    @IsNotEmpty()
    isActive!: boolean;

    @IsString()
    @IsNotEmpty()
    @MaxLength(36)
    profileId!: string;
}