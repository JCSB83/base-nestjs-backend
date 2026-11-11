import {
  ApiTags,
  ApiOperation,
  ApiInternalServerErrorResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { RefreshTokenDto } from '../dto/refreshToken.dto';
import { AccessDto } from '../dto/access.dto';
import type { Request } from 'express';
import { ResponseDto } from 'src/modules/shared/dto/response.dto';
import { CommonController } from 'src/modules/shared/controllers/common.controller';
import { RefreshTokenUseCase } from '../../application/use-cases/refreshToken.use-case';

@ApiTags('Auth')
@ApiInternalServerErrorResponse({
  description: 'No se pudo completar la operacion de autenticacion.',
})
@Controller(['api/v1/auth'])
export class RefreshController extends CommonController {
  constructor(private readonly refreshTokenUseCase: RefreshTokenUseCase) {
    super();
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar la sesion',
    description:
      'Recibe un refresh token en el cuerpo y reemplaza los tokens de la sesion. No requiere un access token en el encabezado.',
    operationId: 'authRefreshToken',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      additionalProperties: false,
      properties: {
        token: {
          type: 'string',
          minLength: 1,
          description: 'Refresh token emitido al iniciar o renovar la sesion',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Datos invalidos, refresh token no registrado o usuario inexistente o inactivo.',
  })
  @ApiOkResponse({
    description: 'Operacion completada.',
    schema: {
      type: 'object',
      required: ['statusCode', 'logId', 'message', 'data'],
      properties: {
        statusCode: { type: 'integer', example: 200 },
        logId: { type: 'string', example: '12345678' },
        message: { type: 'string', example: 'refresh token successful' },
        data: {
          type: 'object',
          required: ['accessToken', 'refreshToken'],
          properties: {
            accessToken: { type: 'string', description: 'JWT de acceso' },
            refreshToken: {
              type: 'string',
              description: 'JWT para renovar la sesion',
            },
          },
        },
      },
    },
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<ResponseDto<AccessDto>> {
    Logger.log(`[${req.logId}] AuthController.refresh`);
    try {
      const accessDto = await this.refreshTokenUseCase.execute(
        dto.token,
        req.logId,
      );
      req.logData = false;
      return new ResponseDto({
        statusCode: HttpStatus.OK,
        logId: req.logId,
        message: 'refresh token successful',
        data: accessDto,
      });
    } catch (error: any) {
      throw await this.getHttpException(
        error,
        'refresh token failed',
        req.logId,
      );
    }
  }
}
