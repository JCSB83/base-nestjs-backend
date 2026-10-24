import { Global, Logger, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { AppConfig } from "./app.config";

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
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
            })
        })
    ],    
    providers: [AppConfig],
    exports: [AppConfig],
})
export class AppConfigModule implements OnModuleInit {
    onModuleInit() {
        Logger.log('AppConfigModule initialized');
    }
}