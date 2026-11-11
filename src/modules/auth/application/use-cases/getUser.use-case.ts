import { Injectable } from "@nestjs/common";
import { IUser } from "../../domain/models/user.interface";
import { UserDto } from "../dto/user.dto";
import { plainToInstance } from "class-transformer";

@Injectable()
export class GetUsertUseCase {
    execute(user: any): IUser | undefined {
        const userDto = plainToInstance(UserDto, user);
        return userDto;
    }
}