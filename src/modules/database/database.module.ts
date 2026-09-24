import appConfig from 'src/app.config';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTypeOrmRepository } from './repositories/user.typeorm.repository';
import { SessionEntity } from './entities/session.entity';
import { RefreshTokenEntity } from './entities/refreshToken.entity';
import { UserEntity } from './entities/user.entity';
import { ProfileEntity } from './entities/profile.entity';
import { OptionEntity } from './entities/option.entity';
import { ProfileOptionEntity } from './entities/profileOption.entity';
import { SessionTypeOrmRepository } from './repositories/session.typeorm.repository';
import { RefreshTokenTypeOrmRepository } from './repositories/refreshToken.typeorm.repository';
import { ProfileTypeOrmRepository } from './repositories/profile.typeorm.repository';
import { OptionTypeOrmRepository } from './repositories/option.typeorm.repository';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      name: appConfig.postgres_connectionName,
      type: 'postgres',
      host: appConfig.postgres_host,
      port: appConfig.postgres_port,
      username: appConfig.postgres_username,
      password: appConfig.postgres_password,
      database: appConfig.postgres_database,
      synchronize: appConfig.postgres_synchronize,
      logging: appConfig.postgres_logging,
      maxQueryExecutionTime: appConfig.postgres_maxExecutionTime,
      migrationsRun: appConfig.postgres_migrationsRun,
      migrations: [__dirname + '/migrations/*.migration{.ts,.js}'],
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      autoLoadEntities: true
    }),
    TypeOrmModule.forFeature([
        OptionEntity,
        ProfileEntity,
        ProfileOptionEntity,
        RefreshTokenEntity,
        SessionEntity,
        UserEntity
      ],
      appConfig.postgres_connectionName
    )
  ],
  providers: [
    ProfileTypeOrmRepository,
    RefreshTokenTypeOrmRepository,
    SessionTypeOrmRepository,
    UserTypeOrmRepository,
    OptionTypeOrmRepository
  ],
  exports: [
    ProfileTypeOrmRepository,
    RefreshTokenTypeOrmRepository,
    SessionTypeOrmRepository,
    UserTypeOrmRepository,
    OptionTypeOrmRepository
  ]
})
export class DatabaseModule implements OnModuleInit {
  onModuleInit() {
    Logger.log('DatabaseModule initialized');
  }
}