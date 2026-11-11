import {
  ApiTags,
  ApiOperation,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import {
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt.authguard';
import { CommonController } from 'src/modules/shared/controllers/common.controller';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { LogoutAllUseCase } from '../../application/use-cases/logoutAll.use-case';

@ApiTags('Auth')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description:
    'Token de acceso ausente, invalido, expirado o sesion sin usuario activo.',
})
@ApiInternalServerErrorResponse({
  description: 'No se pudo completar la operacion de autenticacion.',
})
@Controller(['api/v1/auth'])
@UseGuards(JwtAuthGuard)
export class LogoutController extends CommonController {
  constructor(
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
  ) {
    super();
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cerrar la sesion actual',
    description: 'Elimina la sesion actual y su refresh token.',
    operationId: 'authLogout',
  })
  @ApiNoContentResponse({
    description: 'Operacion completada sin cuerpo de respuesta.',
  })
  async logout(@Req() req: Request): Promise<void> {
    Logger.log(`[${req.logId}] AuthController.logout`);
    try {
      await this.logoutUseCase.execute(req.sessionId, req.logId);
    } catch (error: any) {
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        logId: req.logId,
        error: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cerrar todas las sesiones',
    description:
      'Elimina todas las sesiones y refresh tokens del usuario autenticado.',
    operationId: 'authLogoutAll',
  })
  @ApiNoContentResponse({
    description: 'Operacion completada sin cuerpo de respuesta.',
  })
  async logoutAll(@Req() req: Request): Promise<void> {
    Logger.log(`[${req.logId}] AuthController.logoutAll`);
    try {
      await this.logoutAllUseCase.execute(req.sessionId, req.logId);
    } catch (error: any) {
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        logId: req.logId,
        error: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
}
