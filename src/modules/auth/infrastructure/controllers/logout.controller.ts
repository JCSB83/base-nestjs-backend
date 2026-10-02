import { CommonController } from "src/modules/shared/controllers/common.controller";
import { LogoutUseCase } from "../../application/logout.usecase";
import { JwtAuthGuard } from "../guards/jwt.authguard";
import { Controller, Delete, Logger, Req, UseGuards } from "@nestjs/common";
import { ResponseDto } from "src/modules/shared/utils/infrastructure/response.dto";
import type { Request } from 'express';

@Controller(['api/auth'])
export class LogoutController extends CommonController {
    constructor(private readonly logoutUseCase: LogoutUseCase) { 
        super();
    }
    
    @UseGuards(JwtAuthGuard)
    @Delete('logout')
    async logout(@Req() req: Request): Promise<ResponseDto> {
        Logger.log(`[${req.logId}] AuthController.logout`);
        try {
            await this.logoutUseCase.execute(req.sessionId, req.logId);
            req.logData = false;
            return new ResponseDto({
                statusCode: 200,
                logId: req.logId,
                message: 'logout successful',
            });
        } catch (error: any) {
            throw await this.getHttpException(error, 'logout failed', req.logId);
        }
    }
}