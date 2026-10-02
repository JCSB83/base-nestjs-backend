import { Body, Controller, HttpCode, Logger, Post, Req, UsePipes, ValidationPipe } from "@nestjs/common";
import { CommonController } from "src/modules/shared/controllers/common.controller";
import { RefreshDto } from "../dto/refresh.dto";
import { ResponseDto } from "src/modules/shared/utils/infrastructure/response.dto";
import { AccessDto } from "../dto/access.dto";
import { RefreshTokenUseCase } from "../../application/refreshToken.usecase";
import type { Request } from 'express';

@Controller(['api/auth'])
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class RefreshController extends CommonController {
    constructor(private readonly refreshTokenUseCase: RefreshTokenUseCase) {
        super();
    }

    @Post('refresh')
    @HttpCode(200)
    async refreshToken(@Body() refresh: RefreshDto, @Req() req: Request): Promise<ResponseDto<AccessDto>> {
        Logger.log(`[${req.logId}] AuthController.refresh`);
        try {
            const accessDto = await this.refreshTokenUseCase.execute(refresh.token, req.logId);
            req.logData = false;
            return new ResponseDto({
                statusCode: 200,
                logId: req.logId,
                message: 'refresh token successful',
                data: accessDto,
            });
        } catch (error: any) {
            throw await this.getHttpException(error, 'refresh token failed', req.logId);
        }
    }
}