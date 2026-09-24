import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import appConfig from 'src/app.config';
import { LoginUseCase } from './application/login.usecase';
import { ValidateTokenUseCase } from './application/validateToken.usecase';
import { RefreshTokenUseCase } from './application/refreshToken.usecase';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt.authguard';
import { AUTH_REPOSITORY, AuthRepository } from './infrastructure/repositories/auth.repository';
import { LogoutUseCase } from './application/logout.usecase';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.register({
      secret: appConfig.jwtSecret,
      signOptions: { expiresIn: appConfig.jwtExpiresIn },
    })
  ],
  providers: [
    { provide: AUTH_REPOSITORY, useClass: AuthRepository },
    LoginUseCase,
    LogoutUseCase,
    ValidateTokenUseCase,
    RefreshTokenUseCase,
    JwtStrategy,
    JwtAuthGuard
  ],
  controllers: [AuthController],
  exports: [
    JwtAuthGuard,
    ValidateTokenUseCase
  ]
})
export class AuthModule implements OnModuleInit {
  onModuleInit() {
    Logger.log('AuthModule initialized');
  }
}
