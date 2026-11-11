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

El archivo `.env` se ubica en la raíz de `base-nestjs-backend`; usa
[`.env.example`](../../../.env.example) como referencia. `AppConfigModule`
carga la configuración y valida conjuntamente los esquemas de App y Auth
antes de iniciar la aplicación.

Las variables de PostgreSQL ahora usan el prefijo **`AUTH_DATABASE_`**.
Si migras un `.env` anterior, renombra las claves `DATABASE_*` a
`AUTH_DATABASE_*` según la tabla: los nombres anteriores ya no se consultan
ni sustituyen las claves obligatorias. Las variables `JWT_*` conservan sus
nombres. Se mantiene la escritura `SYNCRONIZE` utilizada en el código.

Todas las variables siguientes son obligatorias en `authConfigSchema`:

| Variable                    | Tipo / unidad             | Uso                                                                            |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `AUTH_DATABASE_HOST`             | Texto                     | Host de PostgreSQL.                                                            |
| `AUTH_DATABASE_PORT`             | Número                    | Puerto de PostgreSQL.                                                          |
| `AUTH_DATABASE_USERNAME`         | Texto                     | Usuario de conexión.                                                           |
| `AUTH_DATABASE_PASSWORD`         | Texto                     | Contraseña de conexión.                                                        |
| `AUTH_DATABASE_NAME`             | Texto                     | Base de datos existente.                                                       |
| `AUTH_DATABASE_SYNCRONIZE`       | Booleano                  | Sincronización automática de entidades. El nombre se escribe así en el código. |
| `AUTH_DATABASE_LOGGING`          | Booleano                  | Logging de TypeORM.                                                            |
| `AUTH_DATABASE_MIGRATIONSRUN`    | Booleano                  | Ejecutar las migraciones descubiertas al iniciar.                              |
| `AUTH_DATABASE_MAXEXECUTIONTIME` | Número, milisegundos      | Umbral de consultas lentas de TypeORM.                                         |
| `JWT_SECRET`                | Texto                     | Secreto de firma y verificación del access token.                              |
| `JWT_EXPIRESIN`             | Entero positivo, segundos | Duración del access token.                                                     |
| `JWT_REFRESH_SECRET`        | Texto                     | Secreto de firma y verificación del refresh token.                             |
| `JWT_REFRESH_EXPIRESIN`     | Entero positivo, segundos | Duración del refresh token.                                                    |

Ejemplo de `.env` para la aplicación, con la base de datos creada y las
migraciones habilitadas para preparar el esquema al iniciar:

```dotenv
PORT=3210
ENVIRONMENT=LOCAL
APP_NAME=base-nestjs-backend
APP_DESCRIPTION="API base con autenticación JWT"
APP_VERSION=1.0.0
LOG_MODE=log4js
LOG_LEVEL=INFO
LOG_DIR=./logs
LOG_NAME=base-nestjs-backend

AUTH_DATABASE_HOST=localhost
AUTH_DATABASE_PORT=5432
AUTH_DATABASE_USERNAME=auth_user
AUTH_DATABASE_PASSWORD=reemplazar_por_la_clave_de_postgres
AUTH_DATABASE_NAME=auth_db
AUTH_DATABASE_SYNCRONIZE=false
AUTH_DATABASE_LOGGING=false
AUTH_DATABASE_MIGRATIONSRUN=true
AUTH_DATABASE_MAXEXECUTIONTIME=30000

JWT_SECRET=reemplazar_por_un_secreto_de_acceso
JWT_EXPIRESIN=900
JWT_REFRESH_SECRET=reemplazar_por_otro_secreto_de_renovacion
JWT_REFRESH_EXPIRESIN=3600
```

### Variables generales de la aplicación

Estas variables pertenecen a `appConfigSchema`, no a Auth:

| Variable | Requisito o valor predeterminado | Uso |
| --- | --- | --- |
| `PORT` | Obligatoria; puerto válido. | Puerto HTTP. |
| `ENVIRONMENT` | Obligatoria: `LOCAL`, `DEV`, `QA` o `PROD`. | Entorno de ejecución. |
| `APP_NAME` | `base-nestjs-backend` si se omite. | Nombre de la aplicación y título de Swagger. |
| `APP_DESCRIPTION` | Cadena vacía si se omite. | Descripción de Swagger. |
| `APP_VERSION` | `1.0.0` si se omite. | Versión publicada en Swagger. |
| `LOG_MODE` | Obligatoria: `log4js` o `loki`. | Proveedor de logging. |
| `LOG_LEVEL` | Obligatoria: `ALL`, `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `MARK` u `OFF`. | Nivel de logging. |
| `LOG_DIR` | Con `log4js`, `./logs` si se omite. | Directorio de logs. |
| `LOG_NAME` | Con `log4js`, `base-nestjs-backend` si se omite. | Nombre de los logs. |
| `LOKI_URL` | Obligatoria con `LOG_MODE=loki`; URL absoluta HTTP o HTTPS. | Endpoint de Loki. |

Usa una sola asignación de `LOG_MODE` en el archivo. Con `log4js` puedes omitir
`LOKI_URL`; con `loki`, `LOG_DIR` y `LOG_NAME` son opcionales.

La conexión se llama **`auth_database`**, según `AUTH_CONNECTION_NAME`.
El nombre es una constante del módulo: no se configura desde `.env`.
`AuthConfig` ya no incluye el getter `databaseConnectionName` y no utiliza
`DATABASE_CONNECTIONNAME` ni `AUTH_DATABASE_CONNECTIONNAME`.

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

Con `AUTH_DATABASE_MIGRATIONSRUN=true`, TypeORM ejecuta las migraciones pendientes
al inicializar la conexión. La base de datos debe existir y el usuario de
conexión debe tener permisos para aplicar los cambios de esquema y datos.
Si las migraciones se ejecutan por un proceso externo, utiliza
`AUTH_DATABASE_MIGRATIONSRUN=false`. El ejemplo mantiene `AUTH_DATABASE_SYNCRONIZE=false`
para gestionar el esquema mediante migraciones.

El módulo también registra explícitamente sus seis entidades con `forFeature`
y `autoLoadEntities: true`.
Si utilizas un DataSource independiente, debes registrar las entidades allí.
El proyecto no incluye actualmente un script específico para migraciones.

La migración de datos crea diez permisos, un perfil `admin` y el usuario
`admin@base.com` con contraseña inicial `password123` almacenada como hash.
Estas credenciales son datos de inicialización: deben sustituirse al provisionar
un entorno real. `synchronize` crea o actualiza estructura, pero no ejecuta esa
carga de datos iniciales.

## API HTTP

Prefijo: `/api/v1/auth`. Swagger está disponible en `/swagger`. Los controladores
protegidos declaran `@ApiBearerAuth()` y `main.ts` registra el esquema con
`DocumentBuilder.addBearerAuth()`, por lo que Swagger UI permite autorizar
las solicitudes con un access token.

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

### Ejemplo de uso en PowerShell

Con el backend iniciado en el puerto del ejemplo de configuración, ejecuta
este flujo con las credenciales de un usuario existente:

```powershell
$authUrl = 'http://localhost:3210/api/v1/auth'
$credentials = Get-Credential -Message 'Credenciales del usuario de Auth'
$loginBody = @{
    email = $credentials.UserName
    password = $credentials.GetNetworkCredential().Password
} | ConvertTo-Json

$login = Invoke-RestMethod -Method Post -Uri "$authUrl/login" -ContentType 'application/json' -Body $loginBody
$tokens = $login.data
$headers = @{ Authorization = "Bearer $($tokens.accessToken)" }

$me = Invoke-RestMethod -Method Get -Uri "$authUrl/me" -Headers $headers
$me.data

$sessions = Invoke-RestMethod -Method Get -Uri "$authUrl/sessions" -Headers $headers
$sessions.data

$refreshBody = @{ token = $tokens.refreshToken } | ConvertTo-Json
$refresh = Invoke-RestMethod -Method Post -Uri "$authUrl/refresh" -ContentType 'application/json' -Body $refreshBody
$tokens = $refresh.data
$headers = @{ Authorization = "Bearer $($tokens.accessToken)" }

Invoke-RestMethod -Method Post -Uri "$authUrl/logout" -Headers $headers
```

Después de renovar, reemplaza **ambos tokens** y actualiza el encabezado Bearer.
La renovación crea un nuevo `jti` y una nueva sesión; el par anterior deja de
ser utilizable una vez completado el reemplazo de sus registros.

### Sesiones y expiración

`GET /sessions` devuelve en `data` un arreglo con `sessionId`, `userId`, `jti`
y `expiresAt` (fecha serializada en formato ISO 8601). La consulta filtra por
usuario, pero no por fecha de expiración; puede incluir registros vencidos
hasta que los elimine la tarea de limpieza.

La sesión expira con el access token. El refresh token tiene su propia
expiración y su propio registro: puede renovar el acceso aunque la sesión
anterior ya haya sido eliminada por la limpieza, siempre que el refresh token
siga siendo válido, exista su registro y el usuario esté activo.

`POST /logout` elimina la sesión actual y su refresh token;
`POST /logout-all` elimina los registros de todas las sesiones y refresh tokens
del usuario. Ambos endpoints requieren un access token válido.

### Comportamientos actuales a considerar

- El guard responde 401 si falta autenticación válida y 500 ante errores
  inesperados. `PermissionsGuard` responde 403 si faltan permisos requeridos.
- Login y refresh convierten los errores de validación del caso de uso a 400.
  En refresh, los errores de verificación JWT se envuelven actualmente como
  errores desconocidos y producen 500, no 401.
- La revocación por `sessionId` requiere autenticación, pero el flujo actual
  no comprueba que la sesión pertenezca al usuario solicitante. No debe
  interpretarse como una comprobación de propiedad de la sesión.
- Si el identificador tiene un formato válido pero la sesión ya no existe,
  la revocación termina con 204. `sessionId` no tiene un pipe de validación
  UUID; un valor mal formado puede provocar un error de persistencia y un 500.

## Ejecución y pruebas

Desde la raíz de `base-nestjs-backend`, con las dependencias instaladas y PostgreSQL
configurado:

```sh
pnpm run start:dev
```

Las pruebas unitarias usan mocks y no requieren PostgreSQL:

```sh
pnpm run test --runInBand --testPathPatterns=src/modules/auth
pnpm run test:cov --runInBand --testPathPatterns=src/modules/auth --collectCoverageFrom="src/modules/auth/**/*.ts" --coverageDirectory=coverage/auth
```

En PowerShell puedes usar `pnpm.cmd` si la política de ejecución bloquea
`pnpm.ps1`. El comando de cobertura genera el reporte en `coverage/auth`.
