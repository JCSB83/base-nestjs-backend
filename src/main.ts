import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { LogInterceptor } from './modules/shared/interceptors/log.interceptor';
import { Log4jsLoggerService } from './modules/shared/services/log4jsLogger.service';
import { LokiLoggerService } from './modules/shared/services/lokiLogger.service';
import { AppConfig } from './app.config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function configureSwagger(app: INestApplication<any>, appConfig: AppConfig) {
    const documentBuilder = new DocumentBuilder()
        .setTitle(appConfig.appName)
        .setDescription(appConfig.appDescription)
        .setVersion(appConfig.appVersion)
        .build();        
    const document = SwaggerModule.createDocument(app, documentBuilder);
    SwaggerModule.setup('swagger', app, document);
}

function configureLogger(app: INestApplication<any>, appConfig: AppConfig) {
    const logger = appConfig.logMode === 'log4js'
        ? app.get(Log4jsLoggerService)
        : app.get(LokiLoggerService);
    app.useLogger(logger);
}

function configureGlobalPipes(app: INestApplication<any>) {
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true
        })
    );
}

function configureInterceptors(app: INestApplication<any>) {
    app.useGlobalInterceptors(app.get(LogInterceptor));
}

function configureShutdown(app: INestApplication<any>): void {
    let shuttingDown = false;
    const shutdown = async (signal: string): Promise<void> => {
        if (shuttingDown) return;
        shuttingDown = true;
        Logger.log(`Closing application (${signal})...`);
        try {
            await app.close();
            process.exitCode = 0;
        } catch (error) {
            Logger.error('Error closing application', error);
            process.exitCode = 1;
        }
    };
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));    
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const appConfig = app.get(AppConfig);

    configureSwagger(app, appConfig);
    configureLogger(app, appConfig);
    configureGlobalPipes(app);
    configureInterceptors(app);
    configureShutdown(app);

    await app.listen(appConfig.port, () => {
        Logger.log(`${appConfig.appName} running on port ${appConfig.port}`);
    });
}
bootstrap();