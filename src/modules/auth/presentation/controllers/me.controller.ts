import {
  ApiTags,
  ApiOperation,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt.authguard';
import { CommonController } from 'src/modules/shared/controllers/common.controller';
import { ResponseDto } from 'src/modules/shared/dto/response.dto';
import { IUser } from '../../domain/models/user.interface';
import { GetUsertUseCase } from '../../application/use-cases/getUser.use-case';

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
export class MeController extends CommonController {
  constructor(private readonly getUserUseCase: GetUsertUseCase) {
    super();
  }

  @Get('me')
  @ApiOperation({
    summary: 'Consultar el usuario autenticado',
    description:
      'Devuelve los datos y permisos del usuario de la sesion actual.',
    operationId: 'authGetMe',
  })
  @ApiOkResponse({
    description: 'Operacion completada.',
    schema: {
      type: 'object',
      required: ['statusCode', 'logId', 'message', 'data'],
      properties: {
        statusCode: { type: 'integer', example: 200 },
        logId: { type: 'string', example: '12345678' },
        message: { type: 'string', example: 'Info found' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            displayName: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
            profileId: { type: 'string', format: 'uuid' },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  async getMe(@Req() req: Request): Promise<ResponseDto<IUser>> {
    Logger.log(`[${req.logId}] AuthController.getMe`);
    const user = this.getUserUseCase.execute(req.user);
    try {
      req.logData = false;
      return new ResponseDto<IUser>({
        statusCode: HttpStatus.OK,
        logId: req.logId,
        message: 'Info found',
        data: user,
      });
    } catch (error: any) {
      throw await this.getHttpException(error, 'info failed', req.logId);
    }
  }
}
