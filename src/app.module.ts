import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { SharedModule } from './modules/shared/shared.module';
import { AppConfigModule } from './app.config.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
    imports: [
        AppConfigModule,
        SharedModule,
        AuthModule
    ]
})
export class AppModule implements OnModuleInit {
    onModuleInit() {
        Logger.log('AppModule initialized');
    }
}
