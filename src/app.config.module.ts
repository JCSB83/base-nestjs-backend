import { Global, Logger, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppConfig, appConfigSchema } from "./app.config";
import { Utils } from "./modules/shared/utils/utils";

const validationSchema = Utils.mergeConfigSchemas(
  appConfigSchema,
);

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: (config: Record<string, unknown>) => {
                const { error, value } = validationSchema.validate(config, {
                    allowUnknown: true,
                    abortEarly: false
                })
                if (error) {
                    throw new Error(`Config validation error: ${error.message}`);
                }
                return value;
            }
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