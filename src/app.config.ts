import { Injectable } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';

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