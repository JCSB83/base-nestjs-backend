# Módulo Auth

Autenticación con JWT, sesiones persistentes en PostgreSQL y permisos asociados
al perfil del usuario. El módulo permite iniciar sesión, renovar tokens,
consultar el usuario autenticado y cerrar o revocar sesiones.

Consulta el detalle de los flujos en [JWT, sesiones, refresh tokens y revocación](docs/authentication.md).
La [arquitectura del módulo](docs/architecture.md) describe la organización DDD,
las responsabilidades de cada capa y sus dependencias actuales.

## Funcionamiento

1. El login busca un usuario por correo y hash de contraseña y verifica que esté
   activo. La implementación actual calcula el hash con SHA-256.
2. Emite un access token y un refresh token con `sub` (identificador del usuario),
   `displayName` y un `jti` compartido. Persiste la sesión y el registro de
   renovación con sus expiraciones, dentro de una transacción.
3. `JwtAuthGuard` verifica el access token, busca su sesión por `jti` y comprueba
   que el usuario siga activo. Agrega `user`, `userId`, `sessionId` y `logId` a la
   solicitud. La autenticación requiere tanto un JWT válido como una sesión existente.
4. La renovación verifica el refresh token y su registro, genera un nuevo par
   de tokens y reemplaza los registros asociados al `jti` anterior.
5. Logout y revocación eliminan sesiones y refresh tokens. Dos tareas programadas
   ejecutan cada minuto la limpieza de registros expirados, con
   `waitForCompletion: true` en cada tarea.

El módulo no ofrece registro de usuarios, recuperación de contraseña ni CRUD de
usuarios o perfiles. Los permisos se obtienen de los perfiles, sus asociaciones
con opciones y las opciones activas.

## Organización

| Ruta                                                | Responsabilidad                                              |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `domain/models`                                     | Contratos de usuario, sesión y refresh token.                |
| `domain/repositories`                               | Interfaces de persistencia utilizadas por los casos de uso.  |
| `application/use-cases`                             | Login, renovación, validación, consultas, logout y limpieza. |
| `application/dto`                                   | Representación del usuario devuelto por la aplicación.       |
| `infrastructure/persistence/typeorm`                | Repositorios, entidades, migraciones y códigos de permisos.  |
| `infrastructure/guards`, `decorators`, `strategies` | Autenticación JWT y autorización por permisos.               |
| `presentation/controllers`, `dto`                   | API HTTP, validación de entradas y documentación Swagger.    |
| `jobs`                                              | Ejecución programada de la limpieza.                         |

Los tokens de inyección `USER_REPOSITORY`, `SESSION_REPOSITORY` y
`REFRESHTOKEN_REPOSITORY` conectan las interfaces con sus adaptadores TypeORM.
Las pruebas `.spec.ts` se encuentran junto a las clases.

## Integración en la aplicación

En este repositorio, `AppModule` ya importa Auth:

```ts
import { Module } from '@nestjs/common';
import { AppConfigModule } from './app.config.module';
import { SharedModule } from './modules/shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [AppConfigModule, SharedModule, AuthModule],
})
export class AppModule {}
```

`AppConfigModule` carga las variables mediante `ConfigModule.forRoot`, expone
`ConfigService` globalmente y combina `appConfigSchema` con `authConfigSchema`.
`AuthConfigModule` provee `AuthConfig`, pero no carga ni valida por sí solo el
entorno. Al trasladar Auth a otra aplicación, conserva esa carga y validación
global o implementa una equivalente.

También se necesitan:

- Las dependencias declaradas en el `package.json` del proyecto: NestJS Config,
  JWT, Passport, Schedule y TypeORM; `passport-jwt`, `typeorm`, `pg`, `joi`,
  `class-validator`, `class-transformer`, `reflect-metadata` y Swagger.
- Los componentes de Shared utilizados por Auth: `CommonController`,
  `ResponseDto`, errores y utilidades. Para el comportamiento HTTP actual,
  conserva además el `LogInterceptor` global, que genera `logId` en las rutas
  públicas y respeta `req.logData` al registrar respuestas.
- La ampliación de tipos Express de `src/@types/express/index.d.ts` y la
  resolución de los imports `src/*`.
- El `ValidationPipe` global de `main.ts`, con `whitelist: true`,
  `forbidNonWhitelisted: true` y `transform: true`.

Auth configura su conexión TypeORM, el módulo JWT y `ScheduleModule.forRoot()`.
Sus exportaciones públicas son **`JwtAuthGuard`** y **`ValidateTokenUseCase`**.

### Proteger rutas de otro módulo

Importa `AuthModule` en el módulo consumidor y aplica el guard al controlador o
al método:

```ts
import { Controller, Get, Module, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthModule } from 'src/modules/auth/auth.module';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt.authguard';

@Controller('private')
@UseGuards(JwtAuthGuard)
class PrivateController {
  @Get('user')
  user(@Req() req: Request) {
    return req.user;
  }
}

@Module({ imports: [AuthModule], controllers: [PrivateController] })
export class PrivateModule {}
```

El cliente debe enviar `Authorization: Bearer <accessToken>`.

### Exigir permisos

`PermissionsGuard` exige **todos** los permisos declarados. Debe ejecutarse
después de `JwtAuthGuard`, que carga el usuario y sus permisos:

```ts
import { Permissions } from 'src/modules/auth/infrastructure/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/modules/auth/infrastructure/guards/permissions.guard';

// Dentro de un controlador con los imports de NestJS y JwtAuthGuard:
@Get('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('USER_READ')
listUsers() {
  // Consultar usuarios mediante el caso de uso correspondiente.
}
```

Registra `PermissionsGuard` en `providers` del módulo consumidor: Auth no lo
registra ni lo exporta actualmente. Los códigos disponibles están en
`infrastructure/persistence/typeorm/enums/optionCode.enum.ts`. Un decorador en
el método prevalece sobre el de la clase; sin permisos requeridos, este guard
permite continuar.

## Configuración

Todas las variables siguientes son obligatorias en `authConfigSchema`:

| Variable                    | Tipo / unidad             | Uso                                                                            |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_HOST`             | Texto                     | Host de PostgreSQL.                                                            |
| `DATABASE_PORT`             | Número                    | Puerto de PostgreSQL.                                                          |
| `DATABASE_USERNAME`         | Texto                     | Usuario de conexión.                                                           |
| `DATABASE_PASSWORD`         | Texto                     | Contraseña de conexión.                                                        |
| `DATABASE_NAME`             | Texto                     | Base de datos existente.                                                       |
| `DATABASE_SYNCRONIZE`       | Booleano                  | Sincronización automática de entidades. El nombre se escribe así en el código. |
| `DATABASE_LOGGING`          | Booleano                  | Logging de TypeORM.                                                            |
| `DATABASE_MIGRATIONSRUN`    | Booleano                  | Ejecutar las migraciones descubiertas al iniciar.                              |
| `DATABASE_MAXEXECUTIONTIME` | Número, milisegundos      | Umbral de consultas lentas de TypeORM.                                         |
| `JWT_SECRET`                | Texto                     | Secreto de firma y verificación del access token.                              |
| `JWT_EXPIRESIN`             | Entero positivo, segundos | Duración del access token.                                                     |
| `JWT_REFRESH_SECRET`        | Texto                     | Secreto de firma y verificación del refresh token.                             |
| `JWT_REFRESH_EXPIRESIN`     | Entero positivo, segundos | Duración del refresh token.                                                    |

Ejemplo de `.env` para la aplicación, con la base de datos creada y las
migraciones habilitadas para preparar el esquema al iniciar:

```dotenv
PORT=3210
ENVIRONMENT=LOCAL
LOG_MODE=log4js
LOG_LEVEL=INFO

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=auth_user
DATABASE_PASSWORD=reemplazar_por_la_clave_de_postgres
DATABASE_NAME=auth_db
DATABASE_SYNCRONIZE=false
DATABASE_LOGGING=false
DATABASE_MIGRATIONSRUN=true
DATABASE_MAXEXECUTIONTIME=30000

JWT_SECRET=reemplazar_por_un_secreto_de_acceso
JWT_EXPIRESIN=900
JWT_REFRESH_SECRET=reemplazar_por_otro_secreto_de_renovacion
JWT_REFRESH_EXPIRESIN=3600
```

`PORT`, `ENVIRONMENT`, `LOG_MODE` y `LOG_LEVEL` pertenecen a la configuración
general de la aplicación, no a Auth. Si eliges `LOG_MODE=loki`, también necesitas
`LOKI_URL`. Usa una sola asignación de `LOG_MODE` en el archivo.

La conexión se llama **`auth_database`**, según `AUTH_CONNECTION_NAME`.
Aunque existe el getter `databaseConnectionName` y el ejemplo general incluye
`DATABASE_CONNECTIONNAME`, esa variable no se usa para nombrar la conexión ni
es obligatoria en `authConfigSchema`.

### Base de datos y migraciones

Las entidades representan opciones, perfiles, asociaciones perfil-opción,
usuarios, sesiones y refresh tokens. Las migraciones están en
`infrastructure/persistence/typeorm/migrations`.

`auth.module.ts` configura la búsqueda de migraciones y entidades en sus
directorios de persistencia, tanto para archivos TypeScript como JavaScript:

```ts
migrations: [
  __dirname + '/infrastructure/persistence/typeorm/migrations/*.migration{.ts,.js}',
],
entities: [
  __dirname + '/infrastructure/persistence/typeorm/entities/*.entity{.ts,.js}',
],
```

Con `DATABASE_MIGRATIONSRUN=true`, TypeORM ejecuta las migraciones pendientes
al inicializar la conexión. La base de datos debe existir y el usuario de
conexión debe tener permisos para aplicar los cambios de esquema y datos.
Si las migraciones se ejecutan por un proceso externo, utiliza
`DATABASE_MIGRATIONSRUN=false`. El ejemplo mantiene `DATABASE_SYNCRONIZE=false`
para gestionar el esquema mediante migraciones.

El módulo también registra explícitamente sus seis entidades con `forFeature`
y `autoLoadEntities: true`.
Si utilizas un DataSource independiente, debes registrar las entidades allí.
El proyecto no incluye actualmente un comando Yarn específico para migraciones.

La migración de datos crea diez permisos, un perfil `admin` y el usuario
`admin@base.com` con contraseña inicial `password123` almacenada como hash.
Estas credenciales son datos de inicialización: deben sustituirse al provisionar
un entorno real. `synchronize` crea o actualiza estructura, pero no ejecuta esa
carga de datos iniciales.

## API HTTP

Prefijo: `/api/v1/auth`. Swagger está disponible en `/swagger` y tiene soporte
Bearer mediante `DocumentBuilder.addBearerAuth()`.

| Método | Ruta                   | Autenticación              | Resultado exitoso                           |
| ------ | ---------------------- | -------------------------- | ------------------------------------------- |
| POST   | `/login`               | Pública                    | 200, access token y refresh token.          |
| POST   | `/refresh`             | Refresh token en el cuerpo | 200, nuevo par de tokens.                   |
| GET    | `/me`                  | Access token               | 200, usuario y permisos.                    |
| GET    | `/sessions`            | Access token               | 200, sesiones del usuario.                  |
| POST   | `/logout`              | Access token               | 204, cierra la sesión actual.               |
| POST   | `/logout-all`          | Access token               | 204, cierra todas las sesiones del usuario. |
| DELETE | `/sessions/:sessionId` | Access token               | 204, revoca la sesión indicada.             |

Login recibe `{"email":"usuario@example.com","password":"clave"}`.
Refresh recibe `{"token":"<refreshToken>"}`; no requiere el encabezado Bearer.
Las respuestas exitosas con cuerpo usan este formato:

```json
{
  "statusCode": 200,
  "logId": "12345678",
  "message": "login successful",
  "data": {
    "accessToken": "<accessToken>",
    "refreshToken": "<refreshToken>"
  }
}
```

Las respuestas 204 no tienen cuerpo. Los DTO rechazan campos adicionales con
el `ValidationPipe` global. Login limita el correo a 320 caracteres y la
contraseña a 64; ambos deben ser strings no vacíos. No incluye `IsEmail`.

### Comportamientos actuales a considerar

- El guard responde 401 si falta autenticación válida y 500 ante errores
  inesperados. `PermissionsGuard` responde 403 si faltan permisos requeridos.
- Login y refresh convierten los errores de validación del caso de uso a 400.
  En refresh, los errores de verificación JWT se envuelven actualmente como
  errores desconocidos y producen 500, no 401.
- La revocación por `sessionId` requiere autenticación, pero el flujo actual
  no comprueba que la sesión pertenezca al usuario solicitante. No debe
  interpretarse como una comprobación de propiedad de la sesión.

## Ejecución y pruebas

Desde la raíz del repositorio, con las dependencias instaladas y PostgreSQL
configurado:

```sh
yarn start:dev
```

Las pruebas unitarias usan mocks y no requieren PostgreSQL:

```sh
yarn test --runInBand --testPathPatterns=src/modules/auth
yarn test:cov --runInBand --testPathPatterns=src/modules/auth --collectCoverageFrom=src/modules/auth/**/*.ts --coverageDirectory=coverage/auth
```

En PowerShell puedes usar `yarn.cmd` si la política de ejecución bloquea
`yarn.ps1`. Consulta también el [reporte de cobertura](../../../docs/auth-test-coverage.md).
