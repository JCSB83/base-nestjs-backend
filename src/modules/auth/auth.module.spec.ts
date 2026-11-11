jest.mock('@nestjs/swagger', () => ({
  ApiTags: () => () => undefined,
  ApiOperation: () => () => undefined,
  ApiInternalServerErrorResponse: () => () => undefined,
  ApiBearerAuth: () => () => undefined,
  ApiUnauthorizedResponse: () => () => undefined,
  ApiBody: () => () => undefined,
  ApiBadRequestResponse: () => () => undefined,
  ApiParam: () => () => undefined,
  ApiOkResponse: () => () => undefined,
  ApiNoContentResponse: () => () => undefined,
}));
jest.mock('@nestjs/typeorm', () => ({
  InjectDataSource: () => () => undefined,
  TypeOrmModule: {
    forRootAsync: jest.fn(() => ({ module: class DatabaseModule {} })),
    forFeature: jest.fn(() => ({ module: class EntitiesModule {} })),
  },
}));
jest.mock('@nestjs/jwt', () => ({
  JwtService: class {},
  JwtModule: { registerAsync: jest.fn(() => ({ module: class JwtModule {} })) },
}));
jest.mock('@nestjs/passport', () => ({
  PassportModule: class {},
  PassportStrategy: () => class {},
}));
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
  CronExpression: { EVERY_MINUTE: '* * * * *' },
  ScheduleModule: {
    forRoot: jest.fn(() => ({ module: class ScheduleModule {} })),
  },
}));
import { Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth.module';
import { AuthConfig } from './auth.config';
import { AuthConfigModule } from './auth.config.module';
import { AUTH_CONNECTION_NAME } from './auth.constants';
import { JwtAuthGuard } from './infrastructure/guards/jwt.authguard';
import { ValidateTokenUseCase } from './application/use-cases/validateToken.use-case';
import {
  USER_REPOSITORY,
  UserRepository,
} from './infrastructure/persistence/typeorm/repositories/user.repository';
import {
  SESSION_REPOSITORY,
  SessionRepository,
} from './infrastructure/persistence/typeorm/repositories/session.repository';
import {
  REFRESHTOKEN_REPOSITORY,
  RefreshTokenRepository,
} from './infrastructure/persistence/typeorm/repositories/refreshToken.repository';
describe('AuthModule', () => {
  afterEach(() => jest.restoreAllMocks());
  const config = {
    jwtSecret: 'secret',
    jwtExpiresIn: 600,
    databaseHost: 'host',
    databasePort: 5432,
    databaseUsername: 'user',
    databasePassword: 'password',
    databaseName: 'auth',
    databaseSynchronize: false,
    databaseLogging: true,
    databaseMaxExecutionTime: 1000,
    databaseMigrationsRun: true,
  } as AuthConfig;
  it('configura JWT desde AuthConfig', async () => {
    // Inspecting a mocked registration method, without invoking an unbound method.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const options = jest.mocked(JwtModule.registerAsync).mock.calls[0][0];
    expect(options.inject).toEqual([AuthConfig]);
    expect(options.imports).toEqual([AuthConfigModule]);
    await expect(Promise.resolve(options.useFactory!(config))).resolves.toEqual(
      { secret: 'secret', signOptions: { expiresIn: 600 } },
    );
  });
  it('configura la conexion PostgreSQL sin abrirla', async () => {
    // Inspecting a mocked registration method, without invoking an unbound method.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const options = jest.mocked(TypeOrmModule.forRootAsync).mock.calls[0][0];
    expect(options.name).toBe(AUTH_CONNECTION_NAME);
    expect(options.inject).toEqual([AuthConfig]);
    const result = await options.useFactory!(config);
    expect(result).toMatchObject({
      name: AUTH_CONNECTION_NAME,
      type: 'postgres',
      host: 'host',
      port: 5432,
      username: 'user',
      password: 'password',
      database: 'auth',
      synchronize: false,
      logging: true,
      maxQueryExecutionTime: 1000,
      migrationsRun: true,
      autoLoadEntities: true,
    });
    expect(result.migrations).toEqual([
      __dirname +
        '/infrastructure/persistence/typeorm/migrations/*.migration{.ts,.js}',
    ]);
    expect(result.entities).toEqual([
      __dirname +
        '/infrastructure/persistence/typeorm/entities/*.entity{.ts,.js}',
    ]);
  });
  it('registra entidades en la conexion Auth y enlaza interfaces con adaptadores', () => {
    // Inspecting a mocked registration method, without invoking an unbound method.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const [entities, connection] = jest.mocked(TypeOrmModule.forFeature).mock
      .calls[0];
    expect(connection).toBe(AUTH_CONNECTION_NAME);
    expect(
      entities?.map((entity) => (entity as { name: string }).name),
    ).toEqual([
      'OptionEntity',
      'ProfileEntity',
      'ProfileOptionEntity',
      'RefreshTokenEntity',
      'SessionEntity',
      'UserEntity',
    ]);
    expect(Reflect.getMetadata('providers', AuthModule)).toEqual(
      expect.arrayContaining([
        { provide: USER_REPOSITORY, useClass: UserRepository },
        { provide: SESSION_REPOSITORY, useClass: SessionRepository },
        { provide: REFRESHTOKEN_REPOSITORY, useClass: RefreshTokenRepository },
      ]),
    );
    expect(Reflect.getMetadata('exports', AuthModule)).toEqual([
      JwtAuthGuard,
      ValidateTokenUseCase,
    ]);
    const controllers = Reflect.getMetadata('controllers', AuthModule) as {
      name: string;
    }[];
    expect(controllers.map((controller) => controller.name)).toEqual([
      'LoginController',
      'LogoutController',
      'MeController',
      'RefreshController',
      'SessionController',
    ]);
  });
  it('registra la inicializacion del modulo', () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    new AuthModule().onModuleInit();
    expect(log).toHaveBeenCalledWith('AuthModule initialized');
  });
});
