import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(320)
    email!: string;

    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    password!: string;
}
