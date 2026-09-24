import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    userName!: string;

    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    password!: string;
}
