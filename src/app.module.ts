import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { SharedModule } from './modules/shared/shared.module';
import { AppConfigModule } from './app.config.module';

@Module({
    imports: [
        AppConfigModule,
        SharedModule
    ]
})
export class AppModule implements OnModuleInit {
    onModuleInit() {
        Logger.log('AppModule initialized');
    }
}
