import { Controller, Delete, Get, HttpException, Logger, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ResponseDto } from 'src/modules/shared/utils/infrastructure/response.dto';
import { AccessDto } from '../dto/access.dto';
import type { Request } from 'express';
import { LogoutUseCase } from '../../application/logout.usecase';
import { JwtAuthGuard } from '../guards/jwt.authguard';
import { CommonController } from 'src/modules/shared/controllers/common.controller';

@Controller(['api/auth'])
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class InfoController extends CommonController {
    constructor(private readonly logoutUseCase: LogoutUseCase) { 
        super();
    }

    @UseGuards(JwtAuthGuard)
    @Get('info')
    async info(@Req() req: Request): Promise<ResponseDto<AccessDto>> {
        Logger.log(`[${req.logId}] AuthController.login`);
        try {
            req.logData = false;
            return new ResponseDto({
                statusCode: 200,
                logId: req.logId,
                message: 'User found',
                data: req.user
            });
        } catch (error: any) {
            throw new HttpException(
                new ResponseDto({
                    statusCode: 500,
                    logId: req.logId,
                    message: '',
                    error: ''
                }),
                500
            );
        }
    }
}
