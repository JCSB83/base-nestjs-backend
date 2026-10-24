import { NestFactory } from '@nestjs/core';
import { LoggerService } from '@nestjs/common';
import { AppModule } from './app.module';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { LogInterceptor } from './modules/shared/interceptors/log.interceptor';
import { AppConfig } from './app.config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LOGGER_SERVICE } from './modules/shared/shared.module';

function configureSwagger(app: INestApplication<any>, appConfig: AppConfig) {
    const documentBuilder = new DocumentBuilder()
        .setTitle(appConfig.appName)
        .setDescription(appConfig.appDescription)
        .setVersion(appConfig.appVersion)
        .build();        
    const document = SwaggerModule.createDocument(app, documentBuilder);
    SwaggerModule.setup('swagger', app, document);
}

function configureLogger(app: INestApplication<any>) {
    const logger = app.get<LoggerService>(LOGGER_SERVICE);
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
    try {
        const app = await NestFactory.create(AppModule, { bufferLogs: true });
        const appConfig = app.get(AppConfig);

        configureSwagger(app, appConfig);
        configureLogger(app);
        configureGlobalPipes(app);
        configureInterceptors(app);
        configureShutdown(app);

        await app.listen(appConfig.port, () => {
            Logger.log(`${appConfig.appName} running on port ${appConfig.port}`);
        });
    } catch (error) {
        Logger.error('Error starting the application:', error);
        process.exit(1);
    }
}
bootstrap();