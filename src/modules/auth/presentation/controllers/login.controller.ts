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
import type { Request } from 'express';
import { LoginDto } from '../dto/login.dto';
import { AccessDto } from '../dto/access.dto';
import { CommonController } from 'src/modules/shared/controllers/common.controller';
import { ResponseDto } from 'src/modules/shared/dto/response.dto';
import { LoginUseCase } from '../../application/use-cases/login.use-case';

@ApiTags('Auth')
@ApiInternalServerErrorResponse({
  description: 'No se pudo completar la operacion de autenticacion.',
})
@Controller(['api/v1/auth'])
export class LoginController extends CommonController {
  constructor(private readonly loginUseCase: LoginUseCase) {
    super();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesion',
    description:
      'Valida las credenciales y crea una sesion con tokens de acceso y renovacion.',
    operationId: 'authLogin',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      additionalProperties: false,
      properties: {
        email: {
          type: 'string',
          minLength: 1,
          maxLength: 320,
          example: 'usuario@example.com',
        },
        password: {
          type: 'string',
          format: 'password',
          minLength: 1,
          maxLength: 64,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada invalidos, usuario inexistente o inactivo.',
  })
  @ApiOkResponse({
    description: 'Operacion completada.',
    schema: {
      type: 'object',
      required: ['statusCode', 'logId', 'message', 'data'],
      properties: {
        statusCode: { type: 'integer', example: 200 },
        logId: { type: 'string', example: '12345678' },
        message: { type: 'string', example: 'login successful' },
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
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<ResponseDto<AccessDto>> {
    Logger.log(`[${req.logId}] AuthController.login`);
    try {
      const accessDto = await this.loginUseCase.execute(dto, req.logId);
      req.logData = false;
      return new ResponseDto({
        statusCode: HttpStatus.OK,
        logId: req.logId,
        message: 'login successful',
        data: accessDto,
      });
    } catch (error: any) {
      throw await this.getHttpException(error, 'login failed', req.logId);
    }
  }
}
