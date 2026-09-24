import { Body, Controller, Delete, Get, HttpException, Logger, Param, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import type { Request } from "express";
import { ResponseDto } from "src/modules/shared/utils/infrastructure/response.dto";
import { CreateUserDto } from "../dto/createUser.dto";
import { UpdateUserDto } from "../dto/updateUser.dto";
import { CreateUserUseCase } from "../../application/createUser.usecase";
import { DeleteUserUseCase } from "../../application/deleteUser.usecase";
import { SearchUserUseCase } from "../../application/searchUser.usecase";
import { UpdateUserUseCase } from "../../application/updateUser.usecase";
import { readUserUseCase } from "../../application/readUser.usecase";
import { IUser } from "../../domain/models/user.interface";
import { JwtAuthGuard } from "src/modules/auth/infrastructure/guards/jwt.authguard";
import { Permissions } from "src/common/decorators/permissions.decorator";
import { PermissionsGuard } from "src/modules/auth/infrastructure/guards/permissions.guard";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/users')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class UsersController {
    constructor(private readonly createUserUseCase: CreateUserUseCase,
                private readonly deleteUserUseCase: DeleteUserUseCase,
                private readonly readUserUseCase: readUserUseCase,
                private readonly searchUserUseCase: SearchUserUseCase,
                private readonly updateUserUseCase: UpdateUserUseCase) {}

    @Post()
    @Permissions('USER_CREATE')
    async create(@Body() user: CreateUserDto, @Req() req: Request): Promise<ResponseDto<string>> {
        const logId = req.logId;
        req.logData = false;
        Logger.log(`[${logId}] UserController.create`);
        try {
            const userId = await this.createUserUseCase.execute(user, logId);
            return new ResponseDto<string>({
                statusCode: 200,
                logId: logId,
                message: '',
                data: userId
            });
        } catch (error: any) {
            throw new HttpException(new ResponseDto({
                statusCode: 500,
                logId: logId,
                message: '',
                error: '',
            }), 500);
        }
    }

    @Get(':userId')
    @Permissions('USER_READ')
    async read(@Param('userId') userId: string, @Req() req: Request): Promise<ResponseDto<IUser | undefined>> {
        const logId = req.logId;
        req.logData = false;
        Logger.log(`[${logId}] UserController.read`);
        try {
            const user = await this.readUserUseCase.execute(userId, logId);
            if (!user) {
                throw new HttpException(
                    new ResponseDto({
                        statusCode: 400,
                        logId: logId,
                        message: '',
                        error: '',
                    }), 
                400);
            }
            return new ResponseDto<IUser>({
                statusCode: 200,
                logId: logId,
                message: '',
                data: user
            });
        } catch (error: any) {
            throw new HttpException(new ResponseDto({
                statusCode: 500,
                logId: logId,
                message: '',
                error: '',
            }), 500);
        }
    }

    @Put()
    @Permissions('USER_UPDATE')
    async update(@Body() user: UpdateUserDto, @Req() req: Request): Promise<ResponseDto> {
        const logId = req.logId;
        req.logData = false;
        Logger.log(`[${logId}] UserController.update`);
        try {
            await this.updateUserUseCase.execute(user, logId);
            return new ResponseDto<string>({
                statusCode: 200,
                logId: logId,
                message: '',
            });

        } catch (error: any) {
            throw new HttpException(new ResponseDto({
                statusCode: 500,
                logId: logId,
                message: '',
                error: '',
            }), 500);
        }
    }

    @Delete(':userId')
    @Permissions('USER_DELETE')
    async delete(@Param('userId') userId: string, @Req() req: Request): Promise<ResponseDto> {
        const logId = req.logId;
        req.logData = false;
        Logger.log(`[${logId}] UserController.delete`);
        try {
            await this.deleteUserUseCase.execute(userId, logId);
            return new ResponseDto<string>({
                statusCode: 200,
                logId: logId,
                message: '',
            });
        } catch (error: any) {
            throw new HttpException(new ResponseDto({
                statusCode: 500,
                logId: logId,
                message: '',
                error: '',
            }), 500);
        }
    }
    
    @Get()
    @Permissions('USER_SEARCH')
    async search(@Req() req: Request): Promise<ResponseDto<IUser[]>> {
        const logId = req.logId;
        req.logData = false;
        Logger.log(`[${logId}] UserController.search`);
        try {
            const users = await this.searchUserUseCase.execute(logId);
            return new ResponseDto<IUser[]>({
                statusCode: 200,
                logId: logId,
                message: `${users.length} users found`,
                data: users
            });
        } catch (error: any) {
            throw new HttpException(new ResponseDto({
                statusCode: 500,
                logId: logId,
                message: '',
                error: ''
            }), 500);
        }
    }
}