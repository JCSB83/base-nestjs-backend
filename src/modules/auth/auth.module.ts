import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import { DeleteExpiredRefreshTokensUseCase } from './application/use-cases/deleteExpiredRefreshTokens.use-case';
import { DeleteExpiredSessionsUseCase } from './application/use-cases/deletedExpiredSessions.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { LogoutAllUseCase } from './application/use-cases/logoutAll.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refreshToken.use-case';
import { RevokeSessionUseCase } from './application/use-cases/revokeSession.use-case';
import { ValidateTokenUseCase } from './application/use-cases/validateToken.use-case';

import { JwtAuthGuard } from './infrastructure/guards/jwt.authguard';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { DeleteExpiredSessionsCron } from './jobs/deleteExpiredSessions.cron';
import { DeleteExpiredRefreshTokensCron } from './jobs/deleteExpiredRefreshTokens.cron';

import { LoginController } from "./presentation/controllers/login.controller";
import { LogoutController } from "./presentation/controllers/logout.controller";
import { MeController } from "./presentation/controllers/me.controller";
import { RefreshController } from "./presentation/controllers/refresh.controller";
import { SessionController } from "./presentation/controllers/session.controller";
import { GetSessionsUseCase } from './application/use-cases/getSessions.use-case';
import { AuthConfig } from './auth.config';
import { UserEntity } from './infrastructure/persistence/typeorm/entities/user.entity';
import { SessionEntity } from './infrastructure/persistence/typeorm/entities/session.entity';
import { RefreshTokenEntity } from './infrastructure/persistence/typeorm/entities/refreshToken.entity';
import { ProfileOptionEntity } from './infrastructure/persistence/typeorm/entities/profileOption.entity';
import { ProfileEntity } from './infrastructure/persistence/typeorm/entities/profile.entity';
import { OptionEntity } from './infrastructure/persistence/typeorm/entities/option.entity';
import { AUTH_CONNECTION_NAME } from './auth.constants';
import { REFRESHTOKEN_REPOSITORY, RefreshTokenRepository } from './infrastructure/persistence/typeorm/repositories/refreshToken.repository';
import { SESSION_REPOSITORY, SessionRepository } from './infrastructure/persistence/typeorm/repositories/session.repository';
import { USER_REPOSITORY, UserRepository } from './infrastructure/persistence/typeorm/repositories/user.repository';
import { OptionRepository } from './infrastructure/persistence/typeorm/repositories/option.repository';
import { AuthConfigModule } from './auth.config.module';
import { GetUsertUseCase } from './application/use-cases/getUser.use-case';

@Module({
    imports: [
        AuthConfigModule,

        ScheduleModule.forRoot(),
        PassportModule,
        JwtModule.registerAsync({
            inject: [AuthConfig],
            imports: [AuthConfigModule],
            useFactory: (config: AuthConfig) => ({
                secret: config.jwtSecret,
                signOptions: { 
                    expiresIn: config.jwtExpiresIn 
                },
            }),
        }),
        TypeOrmModule.forRootAsync({
            name: AUTH_CONNECTION_NAME,
            imports: [AuthConfigModule],
            inject: [AuthConfig],
            useFactory: (config: AuthConfig) => ({
                name: AUTH_CONNECTION_NAME,
                type: 'postgres',
                host: config.databaseHost,
                port: config.databasePort,
                username: config.databaseUsername,
                password: config.databasePassword,
                database: config.databaseName,
                synchronize: config.databaseSynchronize,
                logging: config.databaseLogging,
                maxQueryExecutionTime: config.databaseMaxExecutionTime,
                migrationsRun: config.databaseMigrationsRun,
                migrations: [__dirname + '/infrastructure/persistence/typeorm/migrations/*.migration{.ts,.js}'],
                entities: [__dirname + '/infrastructure/persistence/typeorm/entities/*.entity{.ts,.js}'],
                autoLoadEntities: true
            })
        }),
        TypeOrmModule.forFeature([
            OptionEntity,
            ProfileEntity,
            ProfileOptionEntity,
            RefreshTokenEntity,
            SessionEntity,
            UserEntity
        ],
        AUTH_CONNECTION_NAME)
    ],
    providers: [
        DeleteExpiredSessionsUseCase,
        DeleteExpiredRefreshTokensUseCase,
        GetSessionsUseCase,
        GetUsertUseCase,
        LoginUseCase,
        LogoutUseCase,
        LogoutAllUseCase,
        RefreshTokenUseCase,
        RevokeSessionUseCase,
        ValidateTokenUseCase,
        JwtStrategy,
        JwtAuthGuard,
        DeleteExpiredSessionsCron,
        DeleteExpiredRefreshTokensCron,
        { provide: REFRESHTOKEN_REPOSITORY, useClass: RefreshTokenRepository },
        { provide: SESSION_REPOSITORY, useClass: SessionRepository },
        { provide: USER_REPOSITORY, useClass: UserRepository },
        RefreshTokenRepository,
        OptionRepository
    ],
    controllers: [
        LoginController, 
        LogoutController, 
        MeController,
        RefreshController, 
        SessionController,
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