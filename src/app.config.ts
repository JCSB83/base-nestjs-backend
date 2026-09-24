import * as dotenv from 'dotenv';

class AppConfig {
  private static _instance: AppConfig = new AppConfig();
  public static getInstance(): AppConfig {
    return this._instance;
  }

  environment: string;
  appName: string;
  appVersion: string;
  logMode: string;
  logLevel: string;
  logDir: string;
  logName: string;
  lokiURL: string;

  port!: number;
  postgres_host!: string;
  postgres_port!: number;
  postgres_username!: string;
  postgres_password!: string;
  postgres_database!: string;
  postgres_synchronize!: boolean;
  postgres_logging!: boolean;
  postgres_migrationsRun!: boolean;
  postgres_maxExecutionTime!: number;
  postgres_connectionName!: string;

  jwtSecret!: string;
  jwtExpiresIn!: number;
  jwtRefreshSecret!: string;
  jwtRefreshExpiresIn!: number;

  constructor() {
    dotenv.config({ quiet: true });

    this.port = process.env.PORT ? Number(process.env.PORT) : 4321;
    this.postgres_host = process.env.POSTGRES_HOST ? process.env.POSTGRES_HOST : '';
    this.postgres_port = process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 0;
    this.postgres_username = process.env.POSTGRES_USERNAME ? process.env.POSTGRES_USERNAME : '';
    this.postgres_password = process.env.POSTGRES_PASSWORD ? process.env.POSTGRES_PASSWORD : '';
    this.postgres_database = process.env.POSTGRES_DATABASE ? process.env.POSTGRES_DATABASE : '';
    this.postgres_synchronize = false;
    const postgres_synchronize = process.env.POSTGRES_SYNCRONIZE ? process.env.POSTGRES_SYNCRONIZE : 'false';
    if (postgres_synchronize === 'true' || postgres_synchronize === '1') {
      this.postgres_synchronize = true;
    }
    this.postgres_logging = false;
    const postgres_logging = process.env.POSTGRES_LOGGING ? process.env.POSTGRES_LOGGING : 'false';
    if (postgres_logging === 'true' || postgres_logging === '1') {
      this.postgres_logging = true;
    }
    this.postgres_migrationsRun = false;
    const postgres_migrationsRun = process.env.POSTGRES_MIGRATIONSRUN ? process.env.POSTGRES_MIGRATIONSRUN : 'false';
    if (postgres_migrationsRun === 'true' || postgres_migrationsRun === '1') {
      this.postgres_migrationsRun = true;
    }
    this.postgres_maxExecutionTime = process.env.POSTGRES_MAXEXECUTIONTIME ? Number(process.env.POSTGRES_MAXEXECUTIONTIME) : 30000;
    this.postgres_connectionName = process.env.POSTGRES_CONNECTIONNAME ? process.env.POSTGRES_CONNECTIONNAME : 'default';

    this.environment = process.env.ENVIRONMENT ? process.env.ENVIRONMENT : 'development';
    this.appName = process.env.APP_NAME ? process.env.APP_NAME : 'base_nestjs_backend';
    this.appVersion = process.env.APP_VERSION ? process.env.APP_VERSION : '1.0.0';
    this.logMode = process.env.LOG_MODE ? process.env.LOG_MODE : 'log4js';
    this.logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'debug';
    this.logDir = process.env.LOG_DIR ? process.env.LOG_DIR : './logs';
    this.logName = process.env.LOG_NAME ? process.env.LOG_NAME : 'base_nestjs_backend';
    this.lokiURL = process.env.LOKI_URL ? process.env.LOKI_URL : 'http://localhost:3100/loki/api/v1/push';

    this.jwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET : 'mi_secret_key';
    this.jwtExpiresIn = process.env.JWT_EXPIRESIN ? Number(process.env.JWT_EXPIRESIN) : 900000; //15m
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ? process.env.JWT_REFRESH_SECRET : 'mi_refresh_secret_key';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRESIN ? Number(process.env.JWT_REFRESH_EXPIRESIN) : 3600000; //1h
  }
}

const appConfig = AppConfig.getInstance();
export default appConfig;
