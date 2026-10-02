import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import appConfig from 'src/app.config';
import { LoginUseCase } from './application/login.usecase';
import { ValidateTokenUseCase } from './application/validateToken.usecase';
import { RefreshTokenUseCase } from './application/refreshToken.usecase';
import { InfoController } from './infrastructure/controllers/info.controller';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt.authguard';
import { AUTH_REPOSITORY, AuthRepository } from './infrastructure/repositories/auth.repository';
import { LogoutUseCase } from './application/logout.usecase';
import { RefreshController } from './infrastructure/controllers/refresh.controller';
import { LogoutController } from './infrastructure/controllers/logout.controller';
import { LoginController } from './infrastructure/controllers/login.controller';

@Module({
  imports: [
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
  controllers: [
    LoginController, 
    LogoutController, 
    RefreshController, 
    InfoController
  ],
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
