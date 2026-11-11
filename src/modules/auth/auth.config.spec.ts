import { ConfigService } from '@nestjs/config';
import { AuthConfig, authConfigSchema } from './auth.config';
describe('AuthConfig', () => {
  it.each([
    { property: 'databaseHost', key: 'AUTH_DATABASE_HOST', value: 'value' },
    { property: 'databasePort', key: 'AUTH_DATABASE_PORT', value: 123 },
    {
      property: 'databaseUsername',
      key: 'AUTH_DATABASE_USERNAME',
      value: 'value',
    },
    {
      property: 'databasePassword',
      key: 'AUTH_DATABASE_PASSWORD',
      value: 'value',
    },
    { property: 'databaseName', key: 'AUTH_DATABASE_NAME', value: 'value' },
    {
      property: 'databaseSynchronize',
      key: 'AUTH_DATABASE_SYNCRONIZE',
      value: false,
    },
    { property: 'databaseLogging', key: 'AUTH_DATABASE_LOGGING', value: false },
    {
      property: 'databaseMigrationsRun',
      key: 'AUTH_DATABASE_MIGRATIONSRUN',
      value: false,
    },
    {
      property: 'databaseMaxExecutionTime',
      key: 'AUTH_DATABASE_MAXEXECUTIONTIME',
      value: 123,
    },
    { property: 'jwtSecret', key: 'JWT_SECRET', value: 'value' },
    { property: 'jwtExpiresIn', key: 'JWT_EXPIRESIN', value: 123 },
    { property: 'jwtRefreshSecret', key: 'JWT_REFRESH_SECRET', value: 'value' },
    {
      property: 'jwtRefreshExpiresIn',
      key: 'JWT_REFRESH_EXPIRESIN',
      value: 123,
    },
  ] as const)('$property consulta $key', ({ property, key, value }) => {
    const getOrThrow = jest.fn().mockReturnValue(value);
    expect(
      new AuthConfig({ getOrThrow } as unknown as ConfigService)[property],
    ).toBe(value);
    expect(getOrThrow).toHaveBeenCalledWith(key);
  });
  it.each([
    { property: 'databaseHost', key: 'AUTH_DATABASE_HOST', value: 'value' },
    { property: 'databasePort', key: 'AUTH_DATABASE_PORT', value: 123 },
    {
      property: 'databaseUsername',
      key: 'AUTH_DATABASE_USERNAME',
      value: 'value',
    },
    {
      property: 'databasePassword',
      key: 'AUTH_DATABASE_PASSWORD',
      value: 'value',
    },
    { property: 'databaseName', key: 'AUTH_DATABASE_NAME', value: 'value' },
    {
      property: 'databaseSynchronize',
      key: 'AUTH_DATABASE_SYNCRONIZE',
      value: false,
    },
    { property: 'databaseLogging', key: 'AUTH_DATABASE_LOGGING', value: false },
    {
      property: 'databaseMigrationsRun',
      key: 'AUTH_DATABASE_MIGRATIONSRUN',
      value: false,
    },
    {
      property: 'databaseMaxExecutionTime',
      key: 'AUTH_DATABASE_MAXEXECUTIONTIME',
      value: 123,
    },
    { property: 'jwtSecret', key: 'JWT_SECRET', value: 'value' },
    { property: 'jwtExpiresIn', key: 'JWT_EXPIRESIN', value: 123 },
    { property: 'jwtRefreshSecret', key: 'JWT_REFRESH_SECRET', value: 'value' },
    {
      property: 'jwtRefreshExpiresIn',
      key: 'JWT_REFRESH_EXPIRESIN',
      value: 123,
    },
  ] as const)('$property propaga una variable ausente', ({ property }) => {
    const error = new Error('missing config');
    const config = new AuthConfig({
      getOrThrow: () => {
        throw error;
      },
    } as unknown as ConfigService);
    expect(() => config[property]).toThrow(error);
  });
  const valid = {
    AUTH_DATABASE_HOST: 'localhost',
    AUTH_DATABASE_PORT: 5432,
    AUTH_DATABASE_USERNAME: 'user',
    AUTH_DATABASE_PASSWORD: 'secret',
    AUTH_DATABASE_NAME: 'auth',
    AUTH_DATABASE_SYNCRONIZE: false,
    AUTH_DATABASE_LOGGING: false,
    AUTH_DATABASE_MIGRATIONSRUN: true,
    AUTH_DATABASE_MAXEXECUTIONTIME: 1000,
    JWT_SECRET: 'secret',
    JWT_EXPIRESIN: 600,
    JWT_REFRESH_SECRET: 'refresh',
    JWT_REFRESH_EXPIRESIN: 3600,
  };
  it('acepta configuracion valida', () => {
    expect(authConfigSchema.validate(valid).error).toBeUndefined();
  });
  it.each(Object.keys(valid))('requiere %s', (key) => {
    const input: Record<string, unknown> = { ...valid };
    delete input[key];
    expect(authConfigSchema.validate(input).error?.details[0].path).toEqual([
      key,
    ]);
  });
  it.each([0, -1, 1.5, 'invalid'])(
    'rechaza expiracion invalida: %s',
    (value) => {
      for (const key of ['JWT_EXPIRESIN', 'JWT_REFRESH_EXPIRESIN'])
        expect(
          authConfigSchema.validate({ ...valid, [key]: value }).error
            ?.details[0].path,
        ).toEqual([key]);
    },
  );
});
