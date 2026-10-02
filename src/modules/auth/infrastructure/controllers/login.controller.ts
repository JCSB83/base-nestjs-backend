import { Body, Controller, Logger, Post, Req, UsePipes, ValidationPipe } from "@nestjs/common";
import { LoginUseCase } from "../../application/login.usecase";
import type { Request } from 'express';
import { CommonController } from "src/modules/shared/controllers/common.controller";
import { LoginDto } from "../dto/login.dto";
import { ResponseDto } from "src/modules/shared/utils/infrastructure/response.dto";
import { AccessDto } from "../dto/access.dto";

@Controller(['api/auth'])
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class LoginController extends CommonController {
    constructor(private readonly loginUseCase: LoginUseCase) {
        super();
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<ResponseDto<AccessDto>> {
        Logger.log(`[${req.logId}] AuthController.login`);
        try {
            const accessDto = await this.loginUseCase.execute(loginDto, req.logId);
            req.logData = false;
            return new ResponseDto({
                statusCode: 201,
                logId: req.logId,
                message: 'login successful',
                data: accessDto
            });
        } catch (error: any) {
            throw await this.getHttpException(error, 'login failed', req.logId);
        }
    }
}