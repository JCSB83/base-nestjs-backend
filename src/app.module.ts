import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SharedModule } from './modules/shared/shared.module';

@Module({
  imports: [
    SharedModule,
    HealthModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProfileModule
  ]
})
export class AppModule implements OnModuleInit {
  onModuleInit() {
    Logger.log('AppModule initialized');
  }
}
