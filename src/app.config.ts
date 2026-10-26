import { Injectable } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

@Injectable()
export class AppConfig {
    constructor(private readonly configService: ConfigService) {}

    get port(): number { return this.configService.getOrThrow<number>('PORT'); }
    get environment(): string { return this.configService.getOrThrow<string>('ENVIRONMENT'); }
    get appName(): string { return this.configService.getOrThrow<string>('APP_NAME'); }
    get appDescription(): string { return this.configService.getOrThrow<string>('APP_DESCRIPTION'); }
    get appVersion(): string { return this.configService.getOrThrow<string>('APP_VERSION'); }

    get logMode(): string { return this.configService.getOrThrow<string>('LOG_MODE'); }
    get logLevel(): string { return this.configService.getOrThrow<string>('LOG_LEVEL'); }
    get logDir(): string { return this.configService.getOrThrow<string>('LOG_DIR'); }
    get logName(): string { return this.configService.getOrThrow<string>('LOG_NAME'); }
    get lokiURL(): string { return this.configService.getOrThrow<string>('LOKI_URL'); }
}

export const appConfigSchema = Joi.object({
    PORT: Joi.number().port().required(),
    ENVIRONMENT: Joi.string().valid('LOCAL', 'DEV', 'QA', 'PROD').required(),
    APP_NAME: Joi.string().default('base-nestjs-backend'),
    APP_DESCRIPTION: Joi.string().allow('').optional().default(''),
    APP_VERSION: Joi.string().default('1.0.0'),
    LOG_MODE: Joi.string().valid('log4js', 'loki').required(),
    LOG_LEVEL: Joi.string().valid('ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'MARK', 'OFF').required(),
    LOG_DIR: Joi.when('LOG_MODE', {
        is: 'log4js',
        then: Joi.string().empty().default('./logs'),
        otherwise: Joi.string().allow('', null).optional()
    }),
    LOG_NAME: Joi.when('LOG_MODE', {
        is: 'log4js',
        then: Joi.string().empty().default('base-nestjs-backend'),
        otherwise: Joi.string().allow('', null).optional()
    }),                
    LOKI_URL: Joi.when('LOG_MODE', {
        is: 'loki',
        then: Joi.string().uri({ scheme: ['http', 'https'], allowRelative: false }).required(),
        otherwise: Joi.string().allow('', null).optional()
    })
});