import {
  ApiTags,
  ApiOperation,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiParam,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RevokeSessionUseCase } from '../../application/use-cases/revokeSession.use-case';
import { GetSessionsUseCase } from '../../application/use-cases/getSessions.use-case';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt.authguard';
import { ResponseDto } from 'src/modules/shared/dto/response.dto';
import { ISession } from '../../domain/models/session.interface';
import { CommonController } from 'src/modules/shared/controllers/common.controller';

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
export class SessionController extends CommonController {
  constructor(
    private readonly getSessionsUseCase: GetSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
  ) {
    super();
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Listar sesiones del usuario',
    description: 'Devuelve las sesiones asociadas al usuario autenticado.',
    operationId: 'authGetSessions',
  })
  @ApiOkResponse({
    description: 'Operacion completada.',
    schema: {
      type: 'object',
      required: ['statusCode', 'logId', 'message', 'data'],
      properties: {
        statusCode: { type: 'integer', example: 200 },
        logId: { type: 'string', example: '12345678' },
        message: { type: 'string', example: '2 sessions found' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            required: ['userId', 'jti', 'expiresAt'],
            properties: {
              sessionId: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              jti: { type: 'string', format: 'uuid' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getSessions(@Req() req: Request): Promise<ResponseDto<ISession[]>> {
    Logger.log(`[${req.logId}] AuthController.getSessions`);
    try {
      const userId = req.userId;
      const sessions = await this.getSessionsUseCase.execute(userId, req.logId);
      req.logData = false;
      return new ResponseDto({
        statusCode: HttpStatus.OK,
        logId: req.logId,
        message: `${sessions.length} sessions found`,
        data: sessions,
      });
    } catch (error: any) {
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        logId: req.logId,
        error: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revocar una sesion',
    description:
      'Elimina la sesion identificada por sessionId y su refresh token.',
    operationId: 'authRevokeSession',
  })
  @ApiParam({
    name: 'sessionId',
    required: true,
    description: 'Identificador de la sesion que se desea revocar',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiNoContentResponse({
    description: 'Operacion completada sin cuerpo de respuesta.',
  })
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @Req() req: Request,
  ): Promise<void> {
    Logger.log(`[${req.logId}] SessionController.revokeSession`);
    try {
      await this.revokeSessionUseCase.execute(sessionId, req.logId);
    } catch (error: any) {
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        logId: req.logId,
        error: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
}
