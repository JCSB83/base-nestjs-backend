# Módulo de autenticación

[`src/modules/auth`](../src/modules/auth) implementa el inicio de sesión, la renovación de tokens, la consulta del usuario autenticado y el cierre de sesión. Combina JWT con registros de sesión en PostgreSQL: para acceder a una ruta protegida, el token debe ser válido, su JTI debe tener una sesión registrada y el usuario debe estar activo.

## Estructura e integración

```text
src/modules/auth/
├── auth.module.ts
├── application/              # Login, logout, renovación y validación
├── domain/
│   ├── models/               # IUser, ISession e IRefreshToken
│   └── repositories/         # Contrato IAuthRepository
└── infrastructure/
    ├── controllers/          # API HTTP
    ├── dto/                  # Entrada y salida
    ├── guards/               # Autenticación y permisos
    ├── repositories/         # Adaptación a los repositorios de database
    └── strategies/           # Estrategia JWT de Passport
```

[`AuthModule`](../src/modules/auth/auth.module.ts) importa `PassportModule` y `JwtModule`. Obtiene los repositorios de persistencia del `DatabaseModule` global, registrado en `AppModule`, sin importarlo directamente. Registra los cuatro casos de uso, `JwtStrategy`, `JwtAuthGuard` y el proveedor `{ provide: AUTH_REPOSITORY, useClass: AuthRepository }`. El token `AUTH_REPOSITORY` es un `Symbol` que permite inyectar la implementación del contrato de persistencia.

El módulo expone `JwtAuthGuard` y `ValidateTokenUseCase`. No registra guards globales. Al inicializarse escribe `AuthModule initialized` en el logger. El esquema y los repositorios de persistencia se describen en [database.md](database.md).

## Configuración de JWT

Los valores proceden de [`app.config.ts`](../src/app.config.ts), que carga el entorno mediante `dotenv`.

| Variable | Propiedad | Valor predeterminado |
| --- | --- | --- |
| `JWT_SECRET` | `jwtSecret` | `mi_secret_key` |
| `JWT_EXPIRESIN` | `jwtExpiresIn` | `900000` |
| `JWT_REFRESH_SECRET` | `jwtRefreshSecret` | `mi_refresh_secret_key` |
| `JWT_REFRESH_EXPIRESIN` | `jwtRefreshExpiresIn` | `3600000` |

Las duraciones se convierten mediante `Number` y se pasan directamente a `JwtService.sign` como `expiresIn`. La dependencia instalada interpreta los valores numéricos en **segundos**. Por tanto, los valores predeterminados representan 250 y 1000 horas respectivamente, aunque los comentarios de `AppConfig` indican 15 minutos y una hora. Para esas duraciones, los valores numéricos serían `900` y `3600`. La configuración actual no admite expresiones como `15m`, porque intenta convertirlas a número.

Los tokens de acceso se firman con `jwtSecret` y los de renovación con `jwtRefreshSecret`. Ambos contienen:

| Campo | Contenido |
| --- | --- |
| `username` | Nombre de acceso del usuario. |
| `sub` | Identificador del usuario. |
| `jti` | UUID generado por `Utils.generateJti()`. |
| `iat` | Fecha de emisión agregada por la biblioteca JWT. |
| `exp` | Fecha de expiración calculada al firmar. |

Cada pareja de tokens comparte el mismo JTI. Los permisos no forman parte del payload: se consultan en la base de datos. Para persistir la expiración se convierte `exp`, expresado en segundos, a `Date` mediante `new Date(exp * 1000)`.

## API HTTP

El controlador [`AuthController`](../src/modules/auth/infrastructure/controllers/auth.controller.ts) utiliza la ruta base `/api/auth`.

| Método y ruta | Autenticación | Entrada | HTTP de éxito | `data` |
| --- | --- | --- | --- | --- |
| `POST /api/auth/login` | Pública | `LoginDto` | `201` | `AccessDto` con ambos tokens. |
| `POST /api/auth/refresh` | Pública; valida el token recibido | `RefreshDto` | `200` | Nueva pareja de tokens. |
| `GET /api/auth/info` | `JwtAuthGuard` | Cabecera Bearer | `200` | Usuario cargado en `req.user`. |
| `DELETE /api/auth/logout` | `JwtAuthGuard` | Cabecera Bearer; sin cuerpo requerido | `200` | Sin datos. |

Las respuestas del controlador usan [`ResponseDto`](../src/modules/shared/utils/infrastructure/response.dto.ts), cuyos campos son `statusCode`, `logId`, `title`, `message`, `error` y `data`. Los campos opcionales no asignados se omiten al serializar a JSON.

### Inicio de sesión

```http
POST /api/auth/login
Content-Type: application/json

{
  "userName": "usuario",
  "password": "clave"
}
```

[`LoginDto`](../src/modules/auth/infrastructure/dto/login.dto.ts) exige que ambos campos estén definidos, sean cadenas no vacías y tengan como máximo 64 caracteres.

Respuesta de éxito, HTTP `201`:

```json
{
  "statusCode": 201,
  "logId": "12345678",
  "message": "login successful",
  "data": {
    "accessToken": "<JWT de acceso>",
    "refreshToken": "<JWT de renovación>"
  }
}
```

### Renovación

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "token": "<JWT de renovación>"
}
```

[`RefreshDto`](../src/modules/auth/infrastructure/dto/refresh.dto.ts) requiere una cadena no vacía llamada `token`. No requiere un token de acceso en la cabecera. La respuesta usa `statusCode: 200`, el mensaje `refresh token successful` y un [`AccessDto`](../src/modules/auth/infrastructure/dto/access.dto.ts) con `accessToken` y `refreshToken` nuevos.

### Información y cierre de sesión

Ambas operaciones requieren la cabecera:

```http
Authorization: Bearer <JWT de acceso>
```

`GET /api/auth/info` devuelve el usuario con sus datos de perfil y su arreglo de códigos de permisos, tal como lo construye `AuthRepository`. No devuelve una nueva pareja de tokens. Aunque la firma del método declara `ResponseDto<AccessDto>`, su contenido real es `req.user`.

`DELETE /api/auth/logout` obtiene `sessionId` de la petición, asignado previamente por el guard. Devuelve el mensaje `logout successful` y no incluye `data` en el JSON. El cierre afecta a la pareja asociada al JTI de esa sesión, no a todas las sesiones del usuario. Como la ruta exige un token de acceso válido, un token expirado es rechazado antes de ejecutar el cierre.

### Validación y errores HTTP

El controlador aplica `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`. Los cuerpos inválidos o con propiedades adicionales se rechazan con HTTP `400` antes de ejecutar el método. Esos errores usan el formato de NestJS, no el `ResponseDto` construido por el controlador.

| Situación | Resultado actual |
| --- | --- |
| Credenciales incorrectas o error dentro de `login` | HTTP `500`, `message: "login failed"`, `error: ""`. |
| Error dentro de `refresh` | HTTP `500`, `message: "refresh token failed"`. |
| Error dentro de `logout` | HTTP `500`, `message: "logout failed"`. |
| Error dentro del método `info` | HTTP `500`, mensaje y error vacíos. |
| Cabecera ausente o mal formada, token inválido, sesión ausente o usuario inactivo en una ruta protegida | HTTP `401` desde `JwtAuthGuard`. |
| Permisos insuficientes en una ruta con `PermissionsGuard` | HTTP `403`. |

En los errores de `refresh` y `logout`, el cuerpo usa `statusCode: error.status || 500`, pero el segundo argumento de `HttpException` es siempre `500`; si el error tuviera otro `status`, el cuerpo y el estado HTTP podrían diferir. Los errores de guards ocurren antes del controlador y no pasan por sus bloques `catch`.

## Casos de uso

### `LoginUseCase`

[`execute(loginDto, logId): Promise<AccessDto>`](../src/modules/auth/application/login.usecase.ts):

1. Busca el usuario por nombre y contraseña a través de `IAuthRepository`.
2. Si no existe, lanza `UseCaseError('User not found')`.
3. Genera un JTI y firma los tokens de acceso y renovación.
4. Construye `ISession` e `IRefreshToken` con sus respectivas expiraciones.
5. Espera a que `saveSessionAndRefreshToken(undefined, session, refreshToken, logId)` complete la transacción y devuelve ambos JWT.

La comprobación de contraseña se delega al repositorio de usuarios de `database`, que calcula SHA-256 sin sal con `Utils.createHash`. Esa búsqueda no filtra por `isActive`, y el caso de uso tampoco lo comprueba: el inicio de sesión puede emitir tokens para un usuario inactivo, aunque el guard y la renovación sí exigen un usuario activo.

### `ValidateTokenUseCase`

[`execute(token, logId)`](../src/modules/auth/application/validateToken.usecase.ts) verifica firma y expiración con `jwtSecret`, busca la sesión por el JTI y, si existe, consulta el usuario activo por `decoded.sub`.

Devuelve `{ user, session }` cuando encuentra la sesión; `user` puede ser `undefined`. Si no hay sesión devuelve `undefined`. Los errores se envuelven en `UseCaseError`. El guard es quien exige que el resultado incluya un usuario.

### `RefreshTokenUseCase`

[`execute(refresh_token, logId): Promise<AccessDto>`](../src/modules/auth/application/refreshToken.usecase.ts):

1. Verifica el JWT recibido con `jwtRefreshSecret`.
2. Busca el registro de renovación por su JTI.
3. Busca el usuario activo usando el `userId` del registro persistido.
4. Genera un JTI nuevo y firma otra pareja de tokens.
5. Espera a que `saveSessionAndRefreshToken` elimine los registros del JTI previo y guarde la nueva pareja en una misma transacción antes de devolver los tokens.

La renovación no requiere que siga existiendo la sesión de acceso anterior. Cuando la transacción termina correctamente, los registros del JTI anterior desaparecen y las peticiones posteriores con ese JTI dejan de superar las comprobaciones de persistencia. La implementación no incluye bloqueo o consumo condicional del token para coordinar renovaciones simultáneas.

### `LogoutUseCase`

[`execute(sessionId, logId): Promise<void>`](../src/modules/auth/application/logout.usecase.ts) consulta la sesión por ID y solicita eliminar la sesión y el token de renovación asociados a su JTI. Si no encuentra la sesión lanza `UseCaseError` con mensaje vacío.

## Guards y permisos

### `JwtAuthGuard`

[`JwtAuthGuard`](../src/modules/auth/infrastructure/guards/jwt.authguard.ts) implementa `CanActivate` directamente. Genera un `logId`, exige que `authorization` comience con la cadena exacta `Bearer ` y toma el token con `split(' ')[1]`.

Tras ejecutar `ValidateTokenUseCase`, exige un usuario válido y asigna:

| Campo de la petición | Valor |
| --- | --- |
| `request.logId` | Identificador generado para la operación. |
| `request.user` | Usuario activo con sus permisos actuales. |
| `request.sessionId` | ID de la sesión encontrada. |

Los errores de cabecera conservan mensajes específicos: `Authorization header is missing.`, `Invalid authorization header format.` y `Token is missing.`. Dentro del bloque de validación, el guard contempla `TokenExpiredError` y `JsonWebTokenError`, pero el caso de uso los envuelve en `UseCaseError`; por ello normalmente termina respondiendo `Unauthorized.`. También reemplaza por ese mensaje el rechazo interno `Invalid or inactive user.`.

### `PermissionsGuard`

[`PermissionsGuard`](../src/modules/auth/infrastructure/guards/permissions.guard.ts) lee los metadatos del decorador [`Permissions`](../src/common/decorators/permissions.decorator.ts), bajo la clave `permissions`. Los metadatos del método tienen prioridad sobre los de la clase; no se combinan.

Si no hay permisos exigidos, permite continuar. Si los hay, requiere `request.user` y comprueba con `every` que el usuario tenga **todos** los códigos solicitados. Los permisos ausentes se interpretan como un arreglo vacío.

Uso existente en [`UsersController`](../src/modules/users/infrastructure/controllers/users.controller.ts):

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/users')
export class UsersController {
  // En el método correspondiente:
  // @Permissions('USER_READ')
}
```

El orden permite que el guard JWT cargue el usuario antes de comprobar permisos. `UsersModule` importa `AuthModule`. `PermissionsGuard` se aplica por clase mediante `@UseGuards`; no figura entre los proveedores ni las exportaciones explícitas de `AuthModule`.

### Estrategia Passport

[`JwtStrategy`](../src/modules/auth/infrastructure/strategies/jwt.strategy.ts) está registrada y extrae el token Bearer, verifica con `jwtSecret` y mantiene `ignoreExpiration: false`. Su método `validate` devuelve únicamente `{ userId: payload.sub, username: payload.username }`.

El `JwtAuthGuard` utilizado por los controladores no extiende `AuthGuard('jwt')` ni invoca esa estrategia: usa `ValidateTokenUseCase`. La estrategia por sí sola no consulta sesiones, estado del usuario ni permisos, por lo que no equivale al flujo del guard personalizado.

## Modelos y repositorio de dominio

| Modelo | Campos |
| --- | --- |
| [`IUser`](../src/modules/auth/domain/models/user.interface.ts) | `userId`, `userName`, `password`, `firstName`, `middleName?`, `lastName`, `email`, `phone`, `isActive`, `createdAt`, `updatedAt`, `profileId`, `permissions?`. |
| [`ISession`](../src/modules/auth/domain/models/session.interface.ts) | `sessionId?`, `userId`, `jti`, `expiresAt`. |
| [`IRefreshToken`](../src/modules/auth/domain/models/refreshToken.interface.ts) | `userId`, `jti`, `expiresAt`. |

`expiresAt`, `createdAt` y `updatedAt` representan fechas (`updatedAt` admite `undefined`). El identificador primario del registro de renovación no forma parte de `IRefreshToken`.

[`IAuthRepository`](../src/modules/auth/domain/repositories/auth.repository.interface.ts) define el contrato implementado por [`AuthRepository`](../src/modules/auth/infrastructure/repositories/auth.repository.ts). Todos sus métodos reciben `logId` como último argumento.

| Método | Retorno asíncrono | Función |
| --- | --- | --- |
| `getUserByUserId(userId, logId)` | `IUser \| undefined` | Consulta sin filtrar estado. |
| `getActiveUserByUserId(userId, logId)` | `IUser \| undefined` | Consulta de usuario activo. |
| `getUserByUsernameAndPassword(userName, password, logId)` | `IUser \| undefined` | Búsqueda por credenciales. |
| `getSessionByJTI(jti, logId)` | `ISession \| undefined` | Consulta de sesión por JTI. |
| `getSessionById(sessionId, logId)` | `ISession \| undefined` | Consulta de sesión por clave primaria. |
| `getRefreshTokenByJTI(jti, logId)` | `IRefreshToken \| undefined` | Consulta del registro de renovación. |
| `saveSession(session, logId)` | `string` | Guarda y devuelve el ID de sesión. |
| `saveRefreshToken(refreshToken, logId)` | `string` | Guarda y devuelve el ID del registro de renovación. |
| `deleteSessionAndRefreshToken(jti, logId)` | `void` | Inicia el borrado de ambos registros por JTI. |
| `saveSessionAndRefreshToken(previousJti, session, refreshToken, logId)` | `void` | Guarda la pareja y espera la transacción; si recibe un JTI previo, elimina sus registros antes de insertar. |

La implementación llama `previousJti` al primer argumento del guardado conjunto; el contrato conserva el nombre `previus_jti`. Ambos declaran `Promise<void>`. En el contrato, los parámetros de las búsquedas por JTI se llaman `token`, pero representan el identificador JTI, no el JWT completo.

El adaptador utiliza los repositorios de usuarios, sesiones, tokens y opciones de `database`. `getActiveUserByUserId` y `getUserByUsernameAndPassword` obtienen las opciones mediante `searchActive(logId)`, que filtra `isActive: true` en la consulta. `getUserByUserId` utiliza `search(logId)`, que devuelve todas las opciones.

Al mapear un usuario recorre `profile.profileOptions`, busca cada opción por ID y agrega su `code` solo si la opción está activa, independientemente del método que la haya consultado. No comprueba `profile.isActive` ni otorga privilegios implícitos por `isInternal`. Sin asignaciones de perfil, devuelve `permissions: []`.

Aunque `IUser.password` está declarado como obligatorio y el mapeo copia esa propiedad, `UserEntity.password` tiene `select: false`; las consultas ordinarias no lo cargan y normalmente queda `undefined`, por lo que se omite en JSON.

## Persistencia, trazabilidad y límites actuales

Las operaciones conjuntas de guardado y borrado llaman a `dataSource.transaction(...)` y pasan el mismo `EntityManager` a los repositorios participantes. Su comportamiento difiere:

- `saveSessionAndRefreshToken` utiliza `await dataSource.transaction(...)`. El inicio de sesión y la renovación esperan la finalización del guardado; los errores de la transacción se propagan al caso de uso. En la renovación, el borrado de la pareja anterior y la inserción de la nueva forman parte de esa misma transacción.
- `deleteSessionAndRefreshToken` inicia la transacción sin esperar ni devolver su promesa. El `await` de `LogoutUseCase` no garantiza que el borrado haya terminado antes de responder y no recibe los rechazos posteriores de la transacción.

Las comprobaciones de acceso verifican la expiración del JWT, pero no comparan directamente la fecha actual con `expiresAt` persistido. `ValidateTokenUseCase` tampoco compara `session.userId` con `decoded.sub`; busca el usuario usando el sujeto del JWT. La renovación obtiene el usuario del registro de renovación, sin contrastar explícitamente ese ID con el `sub` recibido. No hay una tarea de limpieza de registros expirados en este módulo.

[`UseCaseError`](../src/modules/shared/errors/usecase.error.ts) conserva el error original en `innerError` y registra su mensaje. Login y logout propagan los `RepositoryError` existentes; renovación y validación los envuelven en `UseCaseError`. Muchos errores de caso de uso tienen mensaje vacío, y el controlador no expone sus detalles.

El [`LogInterceptor`](../src/modules/shared/interceptors/log.interceptor.ts), registrado globalmente en `main.ts`, conserva el `logId` establecido por el guard o genera uno para las rutas públicas. Los endpoints de autenticación asignan `req.logData = false` al responder correctamente para evitar registrar los datos de la respuesta. Se mantienen los registros de ruta, estado y duración.

Estas descripciones corresponden al código actual y distinguen el flujo implementado de sus limitaciones; no implican cambios en la lógica de autenticación.
