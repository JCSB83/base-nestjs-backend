import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

@Injectable()
export class AuthConfig {
    constructor(private readonly configService: ConfigService) {}

    get databaseHost(): string { return this.configService.getOrThrow<string>('AUTH_DATABASE_HOST'); }
    get databasePort(): number { return this.configService.getOrThrow<number>('AUTH_DATABASE_PORT'); }
    get databaseUsername(): string { return this.configService.getOrThrow<string>('AUTH_DATABASE_USERNAME'); }
    get databasePassword(): string { return this.configService.getOrThrow<string>('AUTH_DATABASE_PASSWORD'); }
    get databaseName(): string { return this.configService.getOrThrow<string>('AUTH_DATABASE_NAME'); }
    get databaseSynchronize(): boolean { return this.configService.getOrThrow<boolean>('AUTH_DATABASE_SYNCRONIZE'); }
    get databaseLogging(): boolean { return this.configService.getOrThrow<boolean>('AUTH_DATABASE_LOGGING'); }
    get databaseMigrationsRun(): boolean { return this.configService.getOrThrow<boolean>('AUTH_DATABASE_MIGRATIONSRUN'); }
    get databaseMaxExecutionTime(): number { return this.configService.getOrThrow<number>('AUTH_DATABASE_MAXEXECUTIONTIME'); }

    get jwtSecret(): string { return this.configService.getOrThrow('JWT_SECRET'); }
    get jwtExpiresIn(): number { return this.configService.getOrThrow('JWT_EXPIRESIN'); }
    get jwtRefreshSecret(): string { return this.configService.getOrThrow('JWT_REFRESH_SECRET'); }
    get jwtRefreshExpiresIn(): number { return this.configService.getOrThrow('JWT_REFRESH_EXPIRESIN'); }
}

export const authConfigSchema = Joi.object({
    AUTH_DATABASE_HOST: Joi.string().required(),
    AUTH_DATABASE_PORT: Joi.number().required(),
    AUTH_DATABASE_USERNAME: Joi.string().required(),
    AUTH_DATABASE_PASSWORD: Joi.string().required(),
    AUTH_DATABASE_NAME: Joi.string().required(),
    AUTH_DATABASE_SYNCRONIZE: Joi.boolean().required(),
    AUTH_DATABASE_LOGGING: Joi.boolean().required(),
    AUTH_DATABASE_MIGRATIONSRUN: Joi.boolean().required(),
    AUTH_DATABASE_MAXEXECUTIONTIME: Joi.number().required(),
                
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRESIN: Joi.number().integer().positive().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_REFRESH_EXPIRESIN: Joi.number().integer().positive().required()
});