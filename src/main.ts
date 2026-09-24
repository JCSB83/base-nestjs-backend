import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import appConfig from './app.config';
import { Logger } from '@nestjs/common';
import { LogInterceptor } from './modules/shared/interceptors/log.interceptor';
import { Log4jsLoggerService } from './modules/shared/services/log4jsLogger.service';
import { LokiLoggerService } from './modules/shared/services/lokiLogger.service';

async function bootstrap() {
  try {
        const app = await NestFactory.create(AppModule, {
            bufferLogs: true
        });
        const logger = appConfig.logMode === 'log4js'
            ? app.get(Log4jsLoggerService)
            : app.get(LokiLoggerService);
        app.useLogger(logger);
        app.useGlobalInterceptors(app.get(LogInterceptor));

        await app.listen(appConfig.port);
        Logger.log(`${appConfig.appName} running on port ${appConfig.port}`);
        const shutdown = async () => {
            Logger.log('Closing application...');
            await app.close();
            process.exit(0);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } catch (error) {
        Logger.error('Error starting the application:', error);
        process.exit(1);
    }

}
bootstrap();
