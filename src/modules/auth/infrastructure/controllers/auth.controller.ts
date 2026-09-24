import { Body, Controller, Delete, Get, HttpCode, HttpException, Logger, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ResponseDto } from 'src/modules/shared/utils/infrastructure/response.dto';
import { RefreshTokenUseCase } from '../../application/refreshToken.usecase';
import { LoginUseCase } from '../../application/login.usecase';
import { AccessDto } from '../dto/access.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import type { Request } from 'express';
import { LogoutUseCase } from '../../application/logout.usecase';
import { JwtAuthGuard } from '../guards/jwt.authguard';

@Controller(['api/auth'])
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AuthController {
    constructor(
        private readonly loginUseCase: LoginUseCase,
        private readonly logoutUseCase: LogoutUseCase,
        private readonly refreshTokenUseCase: RefreshTokenUseCase
    ) {}

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<ResponseDto<AccessDto>> {
        Logger.log(`[${req.logId}] AuthController.login`);
        try {
            const accessDto = await this.loginUseCase.execute(loginDto, req.logId);
            req.logData = false;
            return new ResponseDto({
                statusCode: 200,
                logId: req.logId,
                message: 'login successful',
                data: accessDto
            });
        } catch (error: any) {
            throw new HttpException(
                new ResponseDto({
                    statusCode: 500,
                    logId: req.logId,
                    message: 'login failed',
                    error: ''
                }),
                500
            );
        }
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
                message: '',
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

    @Post('refresh')
    @HttpCode(200)
    async refreshToken(@Body() refresh: RefreshDto, @Req() req: Request): Promise<ResponseDto> {
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
            throw new HttpException(
                new ResponseDto({
                    statusCode: error.status || 500,
                    logId: req.logId,
                    message: 'refresh token failed',
                    error: ''
                }),
                error.status || 500,
            );
        }
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
                data: undefined
            });
        } catch (error: any) {
            throw new HttpException(
                new ResponseDto({
                    statusCode: error.status || 500,
                    logId: req.logId,
                    message: 'logout failed',
                    error: ''
                }),
                error.status || 500,
            );
        }
    }
}
