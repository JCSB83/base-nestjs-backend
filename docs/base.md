# Base NestJS Backend

Documentación del código de `src` y de sus pruebas unitarias, revisada el **11 de noviembre de 2026**. El proyecto ofrece una base HTTP con NestJS, configuración validada, Swagger, salud, logs mediante Log4js o Loki y autenticación JWT con sesiones persistentes en PostgreSQL.

## Estructura

| Archivo                                                                                                         | Responsabilidad                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/main.ts`](../src/main.ts)                                                                                 | Arranque, Swagger, logger, validación, interceptor y cierre por señales.                                                                     |
| [`src/app.module.ts`](../src/app.module.ts) | Módulo raíz; importa `AppConfigModule`, `SharedModule` y `AuthModule`. |
| [`src/app.config.module.ts`](../src/app.config.module.ts)                                                       | Carga y validación de variables con ConfigModule y Joi; exporta AppConfig globalmente.                                                       |
| [`src/app.config.ts`](../src/app.config.ts)                                                                     | Getters tipados sobre ConfigService.getOrThrow y esquema Joi de configuración.                                                               |
| [`src/modules/shared/shared.module.ts`](../src/modules/shared/shared.module.ts)                                 | Importa TerminusModule, registra HealthController y crea el logger seleccionado mediante LOGGER_SERVICE. Exporta ese token y LogInterceptor. |
| [`src/modules/shared/controllers/health.controller.ts`](../src/modules/shared/controllers/health.controller.ts) | Endpoints de vida y disponibilidad.                                                                                                          |
| [`src/modules/shared/interceptors/log.interceptor.ts`](../src/modules/shared/interceptors/log.interceptor.ts)   | Registra ruta, respuesta, estado y duración de las solicitudes.                                                                              |
| [`src/modules/shared/services/log4jsLogger.service.ts`](../src/modules/shared/services/log4jsLogger.service.ts) | Logs a consola y archivos rotativos.                                                                                                         |
| [`src/modules/shared/services/lokiLogger.service.ts`](../src/modules/shared/services/lokiLogger.service.ts)     | Envío HTTP a Loki y salida coloreada en consola.                                                                                             |
| [`src/modules/shared/utils/utils.ts`](../src/modules/shared/utils/utils.ts)                                     | Identificadores de ocho dígitos y combinación de esquemas Joi.                                                                               |
| [`src/@types/express/index.d.ts`](../src/@types/express/index.d.ts) | Extiende Request con `logId`, `logData`, `userId`, `user` y `sessionId`; no asigna valores en ejecución. |
| [`src/modules/auth/auth.module.ts`](../src/modules/auth/auth.module.ts) | Registra PostgreSQL, JWT, Passport, tareas programadas, casos de uso, repositorios y controladores de autenticación. |
| [`src/modules/auth/auth.config.ts`](../src/modules/auth/auth.config.ts) | Getters de `AuthConfig` y esquema Joi de base de datos y JWT. |
| [`src/modules/auth/auth.config.module.ts`](../src/modules/auth/auth.config.module.ts) | Provee y exporta `AuthConfig`; utiliza la configuración global ya cargada. |

Auth separa contratos en `domain`, casos de uso y DTO de aplicación en `application`, adaptadores en `infrastructure`, API HTTP en `presentation` y limpieza programada en `jobs`. Las entidades, repositorios y migraciones TypeORM están en `src/modules/auth/infrastructure/persistence/typeorm/`. Consulta la [arquitectura de Auth](../src/modules/auth/docs/architecture.md) para el detalle de las capas.

## Flujo de arranque

`bootstrap()` crea la aplicación con `NestFactory.create(AppModule, { bufferLogs: true })` y obtiene `AppConfig`. Los mensajes iniciales se almacenan hasta instalar el logger. Configura Swagger en `/swagger` con nombre, descripción y versión de la aplicación. `configureLogger()` obtiene el provider mediante `app.get<LoggerService>(LOGGER_SERVICE)` y lo instala con `app.useLogger()`.

La selección del logger está centralizada en `SharedModule`: una factory que recibe `AppConfig` construye `LokiLoggerService` cuando `LOG_MODE=loki` o `Log4jsLoggerService` cuando `LOG_MODE=log4js`. Solo se construye el servicio seleccionado. Un modo distinto lanza `Error('Invalid logger provider')`, además de la validación previa de Joi.

`LOGGER_SERVICE` es un `Symbol` exportado por `shared.module.ts`. `SharedModule` exporta ese token y `LogInterceptor`; las clases concretas de los loggers ya no se registran ni exportan como providers independientes. Para consumir o sustituir el logger en una prueba, debe utilizarse el mismo token importado, no un nuevo `Symbol` con igual descripción.

Registra un `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true` y `transform: true`. Para los endpoints que utilicen DTO con decoradores de validación, rechaza propiedades no permitidas y transforma la entrada según los tipos y configuración del DTO. Los endpoints de salud actuales no reciben DTO.

Instala `LogInterceptor` globalmente y los manejadores de cierre. Finalmente, `app.listen(appConfig.port, callback)` abre el puerto y registra el mensaje de inicio. La función se invoca al cargar `main.ts`.

La creación de `AppModule` también inicializa la conexión PostgreSQL de Auth. Si `AUTH_DATABASE_MIGRATIONSRUN=true`, ejecuta las migraciones pendientes al conectar. `AppModule`, `AppConfigModule`, `SharedModule` y `AuthModule` registran su inicialización mediante `onModuleInit()`.

El cuerpo de `bootstrap()` está protegido por `try/catch`. Los errores que llegan a ese bloque se registran como `Error starting the application:` y provocan `process.exit(1)`. Este manejo es distinto del cierre normal por señales descrito a continuación.

### Cierre

Los manejadores de `SIGINT` y `SIGTERM` se registran con `process.once`. Una bandera compartida evita cerrar dos veces si llegan ambas señales. El cierre espera `app.close()` y establece `process.exitCode=0`; si falla, registra el error y establece `process.exitCode=1`. No fuerza la salida inmediata con `process.exit()` ni espera explícitamente las solicitudes de logs pendientes.

## Configuración

`AppConfigModule` configura `ConfigModule.forRoot` como global. Los valores se validan con Joi combinando `appConfigSchema` y `authConfigSchema` mediante `Utils.mergeConfigSchemas()`. La validación conserva variables ajenas (`allowUnknown: true`) e informa todos los errores (`abortEarly: false`). Los getters de `AppConfig` y `AuthConfig` usan `getOrThrow`. `AuthConfigModule` no vuelve a cargar ni validar el entorno. Como Auth está importado en el módulo raíz, sus variables también son obligatorias para iniciar la app.

| Variable          | Getter           | Validación o valor predeterminado                                                                                         |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PORT`            | `port`           | Entero obligatorio entre 0 y 65535.                                                                                       |
| `ENVIRONMENT`     | `environment`    | Obligatorio: `LOCAL`, `DEV`, `QA` o `PROD`.                                                                               |
| `APP_NAME`        | `appName`        | `base-nestjs-backend`.                                                                                                    |
| `APP_DESCRIPTION` | `appDescription` | Cadena opcional, admite vacío; por defecto `''`.                                                                          |
| `APP_VERSION`     | `appVersion`     | `1.0.0`.                                                                                                                  |
| `LOG_MODE`        | `logMode`        | Obligatorio: `log4js` o `loki`.                                                                                           |
| `LOG_LEVEL`       | `logLevel`       | Obligatorio: `ALL`, `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `MARK` u `OFF`.                                   |
| `LOG_DIR`         | `logDir`         | En Log4js, por defecto `./logs`; en Loki admite vacío, null o ausencia.                                                   |
| `LOG_NAME`        | `logName`        | En Log4js, por defecto `base-nestjs-backend`; en Loki es opcional. No se usa para construir el nombre del archivo actual. |
| `LOKI_URL`        | `lokiURL`        | Obligatoria en modo Loki: URL absoluta HTTP o HTTPS, sin valor predeterminado. En Log4js admite vacío, null o ausencia.   |

### Configuración de autenticación

Todas estas variables son obligatorias y no tienen valores predeterminados:

| Variable | Validación y uso |
| -------- | --------------- |
| `AUTH_DATABASE_HOST` | Cadena; host de PostgreSQL. |
| `AUTH_DATABASE_PORT` | Número; puerto de PostgreSQL. |
| `AUTH_DATABASE_USERNAME` | Cadena; usuario de conexión. |
| `AUTH_DATABASE_PASSWORD` | Cadena; contraseña de conexión. |
| `AUTH_DATABASE_NAME` | Cadena; nombre de una base de datos existente. |
| `AUTH_DATABASE_SYNCRONIZE` | Booleano; sincronización automática del esquema. Se conserva la grafía `SYNCRONIZE` del código. |
| `AUTH_DATABASE_LOGGING` | Booleano; logging de TypeORM. |
| `AUTH_DATABASE_MIGRATIONSRUN` | Booleano; ejecución de migraciones pendientes al conectar. |
| `AUTH_DATABASE_MAXEXECUTIONTIME` | Número; umbral de consultas lentas en milisegundos. |
| `JWT_SECRET` | Cadena; secreto del access token. |
| `JWT_EXPIRESIN` | Entero positivo; duración del access token en segundos. |
| `JWT_REFRESH_SECRET` | Cadena; secreto del refresh token. |
| `JWT_REFRESH_EXPIRESIN` | Entero positivo; duración del refresh token en segundos. |

El nombre de conexión es `auth_database`, fijado por `AUTH_CONNECTION_NAME`; no existe un getter `databaseConnectionName` ni se necesita una variable para ese nombre. Joi convierte las cadenas numéricas y booleanas del entorno a sus tipos correspondientes.

Ejemplo local compatible con el Compose de PostgreSQL incluido. Sustituye los secretos JWT por valores propios:

```dotenv
PORT=3210
ENVIRONMENT=LOCAL
APP_NAME=base-nestjs-backend
APP_DESCRIPTION=API base
APP_VERSION=1.0.0
LOG_MODE=log4js
LOG_LEVEL=INFO
LOG_DIR=./logs
LOG_NAME=base-nestjs-backend
LOKI_URL=http://127.0.0.1:3100

AUTH_DATABASE_HOST=127.0.0.1
AUTH_DATABASE_PORT=5423
AUTH_DATABASE_USERNAME=postgresusr
AUTH_DATABASE_PASSWORD=postgrespwd
AUTH_DATABASE_NAME=auth
AUTH_DATABASE_SYNCRONIZE=false
AUTH_DATABASE_LOGGING=false
AUTH_DATABASE_MIGRATIONSRUN=true
AUTH_DATABASE_MAXEXECUTIONTIME=30000

JWT_SECRET=reemplazar_por_un_secreto_de_acceso
JWT_EXPIRESIN=900
JWT_REFRESH_SECRET=reemplazar_por_otro_secreto_de_renovacion
JWT_REFRESH_EXPIRESIN=3600
```

Para utilizar Loki, cambia `LOG_MODE=loki` y define una URL absoluta HTTP o HTTPS en `LOKI_URL`. Joi exige esa variable en modo Loki y rechaza rutas relativas o esquemas diferentes. En modo Log4js se puede omitir `LOKI_URL`, porque la factory no construye el servicio Loki. En modo Loki, `LOG_DIR` y `LOG_NAME` son opcionales y no se crea el logger de archivos. `LOG_LEVEL` es obligatorio y filtra los mensajes en ambos modos.

Crea `.env` a partir de [`.env.example`](../.env.example) o del ejemplo anterior. Las expiraciones JWT se pasan como números a `expiresIn`: **900 equivale a 15 minutos y 3600 a una hora**. Los valores `900000` y `3600000` del archivo de ejemplo actual no representan esas duraciones, pese a sus comentarios.

### PostgreSQL y migraciones

Para iniciar la base de desarrollo incluida:

```bash
docker compose -f docker/postgresql-auth/docker-compose.yml up -d
```

El [Compose](../docker/postgresql-auth/docker-compose.yml) utiliza PostgreSQL 17, publica `5423:5432`, crea la base `auth` y conserva los datos en el volumen `postgres_data`. La aplicación ejecutada en el equipo usa `127.0.0.1:5423`. Desde otro contenedor en la misma red, la dirección es `postgres:5432`.

Auth registra seis entidades: opciones, perfiles, asociaciones perfil-opción, usuarios, sesiones y refresh tokens. Descubre entidades con `entities/*.entity{.ts,.js}` y migraciones con `migrations/*.migration{.ts,.js}`, dentro de `infrastructure/persistence/typeorm`, tanto en el código fuente como en la salida compilada.

Con `AUTH_DATABASE_MIGRATIONSRUN=true`, TypeORM aplica las migraciones pendientes al inicializarse. Mantén `AUTH_DATABASE_SYNCRONIZE=false` al gestionar el esquema con migraciones. La base debe existir y el usuario debe tener permisos para aplicar los cambios. La migración de datos incluye permisos, un perfil administrador y el usuario `admin@base.com` con contraseña inicial `password123`; sustituye esas credenciales al provisionar un entorno real.

## Endpoints

| Método y ruta       | Comportamiento                                                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health/live`  | Ejecuta `health.check([])`; comprueba que la aplicación puede atender la solicitud, sin consultar dependencias externas.                                                                                  |
| `GET /health/ready` | En Log4js ejecuta una lista vacía de indicadores. En Loki consulta `${LOKI_URL}/ready` con `HttpHealthIndicator.pingCheck`, nombre `loki` y timeout de 3000 ms. Terminus determina el resultado de salud. |
| `GET /swagger`      | Interfaz Swagger configurada durante el arranque.                                                                                                                                                         |

Ejemplo de respuesta satisfactoria sin indicadores:

```json
{ "status": "ok", "info": {}, "error": {}, "details": {} }
```

Los dos métodos de salud asignan `req.logData=false` para omitir el cuerpo de respuesta en los logs. Esto no elimina las líneas de ruta, estado y duración. En Loki, `/health/live` puede estar sano mientras `/health/ready` falla por la dependencia remota.

Ninguno de los dos endpoints comprueba PostgreSQL. Un resultado satisfactorio de readiness no demuestra que la conexión de autenticación continúe disponible.

### API de autenticación

Todas las rutas siguientes utilizan el prefijo `/api/v1/auth`:

| Método | Ruta | Acceso | Resultado satisfactorio |
| ------ | ---- | ------ | ----------------------- |
| POST | `/login` | Público; cuerpo con `email` y `password`. | 200, access token y refresh token. |
| POST | `/refresh` | Cuerpo con `token` de renovación. | 200, nuevo par de tokens. |
| GET | `/me` | Access token. | 200, usuario y permisos. |
| GET | `/sessions` | Access token. | 200, sesiones del usuario. |
| POST | `/logout` | Access token. | 204, cierre de la sesión actual. |
| POST | `/logout-all` | Access token. | 204, cierre de todas las sesiones del usuario. |
| DELETE | `/sessions/:sessionId` | Access token. | 204, revocación de la sesión indicada. |

Las rutas protegidas requieren `Authorization: Bearer <accessToken>`. Las respuestas con cuerpo utilizan `ResponseDto`, con `statusCode`, `logId`, `message` y `data`; las respuestas 204 no llevan cuerpo. Login y refresh usan DTO validados por el pipe global. Los controladores omiten el cuerpo de las respuestas de tokens, usuario y sesiones en los logs mediante `req.logData=false`.

`JwtAuthGuard` verifica el JWT mediante `ValidateTokenUseCase`, consulta la sesión por `jti` y carga el usuario activo. Asigna `user`, `userId`, `sessionId` y `logId` a la solicitud. Auth exporta `JwtAuthGuard` y `ValidateTokenUseCase` para otros módulos; no instala un guard global.

El login emite dos tokens con un `jti` compartido y persiste sesión y refresh token en una transacción. La renovación reemplaza los registros del `jti` anterior. Dos tareas ejecutadas cada minuto eliminan sesiones y refresh tokens expirados, con `waitForCompletion: true` por tarea.

Para autorización por permisos, `PermissionsGuard` exige todos los códigos declarados con `@Permissions(...)` y debe ejecutarse después de `JwtAuthGuard`. El módulo consumidor debe registrar este guard, porque Auth no lo exporta ni lo incluye en sus providers.

Swagger muestra los controladores, pero `main.ts` actualmente no configura `DocumentBuilder.addBearerAuth()`, aunque los controladores tienen decoradores Bearer. La configuración del esquema de seguridad de Swagger queda pendiente.

## Logs de solicitudes

`LogInterceptor` utiliza una instancia `new Logger(LogInterceptor.name)`, de modo que sus mensajes llevan el contexto `LogInterceptor` al logger configurado. `intercept()` obtiene Request y Response del contexto HTTP. Conserva `req.logId` cuando existe; en caso contrario genera uno. Registra `PATH=<método>:<originalUrl o url>`, activa inicialmente `req.logData` y toma el instante inicial.

Al recibir la respuesta, captura `message` si está presente en el objeto o utiliza la respuesta si es una cadena. Serializa el cuerpo como JSON cuando `logData` permanece activado. El controlador puede desactivarlo durante su ejecución.

En errores, usa el estado y cuerpo de `HttpException`; para otras excepciones registra estado 500 y el mensaje genérico `Internal server error`. Vuelve a propagar la excepción original. En errores con `logData=false` omite `DATA`, aunque puede mantener `MESSAGE`.

`finalize()` registra estado y tiempo transcurrido incluso cuando la ejecución falla. Utiliza `log` para 2xx, `warn` para 4xx, `error` para 5xx y `verbose` para los demás estados.

```text
[00000042] PATH=GET:/health/live
[00000042] STATUS=200 TIME=3ms
```

La extensión de Express declara `logId`, `logData`, `userId`, `user` y `sessionId`; las declaraciones no asignan valores automáticamente. `Utils.generateLogId()` de Shared usa `Math.random`, convierte a entero y rellena a ocho dígitos. Es una etiqueta de correlación, sin garantía de unicidad. Auth tiene sus propias utilidades para hashes SHA-256 y generación de `jti` mediante `randomUUID()`.

## Log4jsLoggerService

Implementa `LoggerService`: `log` se traduce a `info`, `verbose` a `trace` y los demás niveles conservan su nombre. Los parámetros adicionales se reenvían al logger.

Una bandera estática evita configurar Log4js más de una vez por carga del módulo. El logger se obtiene por `APP_NAME`. Configura un appender `stdout` y otro `dateFile` cuya base es `${LOG_DIR}/${APP_NAME}`, patrón `yyyy-MM-dd.log`, separador `-`, tamaño máximo configurado de 2 MiB, 30 respaldos y compresión desactivada. La categoría por defecto aplica `LOG_LEVEL` a ambos destinos.

## LokiLoggerService

Crea un cliente Axios con `baseURL=LOKI_URL`, timeout de 5000 ms y contenido JSON. Cada llamada admitida por `LOG_LEVEL` envía un POST independiente a `/loki/api/v1/push` con las etiquetas `app`, `environment` y `level`. El timestamp se expresa como una cadena en nanosegundos a partir de `Date.now()`, con precisión efectiva de milisegundos.

El mensaje se serializa como `{ message, params }`. Si el mensaje es un `Error`, incluye también `stack`. Los métodos devuelven el control sin esperar la petición; no hay cola, agrupación ni reintentos implementados.

Cuando la petición termina, `finally` imprime fecha local, estado de envío, nivel y mensaje con colores ANSI. Una petición resuelta muestra `[loki ON]`; una rechazada registra el error directamente con `console.error` y muestra `[loki OFF]`. Estas etiquetas describen ese envío, no un estado global de conexión. La consola se escribe en todos los entornos y puede demorarse mientras la petición está pendiente. Los envíos concurrentes pueden aparecer fuera de orden.

### Filtrado por nivel

Cada método comprueba `LOG_LEVEL` antes de serializar el mensaje, enviar HTTP o escribir en consola. `log` corresponde a `INFO`, `verbose` a `TRACE`, y `debug`, `warn` y `error` a sus niveles homónimos.

| `LOG_LEVEL`     | Métodos que emiten mensajes                |
| --------------- | ------------------------------------------ |
| `ALL` o `TRACE` | `verbose`, `debug`, `log`, `warn`, `error` |
| `DEBUG`         | `debug`, `log`, `warn`, `error`            |
| `INFO`          | `log`, `warn`, `error`                     |
| `MARK` o `WARN` | `warn`, `error`                            |
| `ERROR`         | `error`                                    |
| `FATAL` u `OFF` | Ninguno de los cinco métodos implementados |

La prioridad es `ALL < TRACE < DEBUG < INFO < MARK < WARN < ERROR < FATAL < OFF`. No hay métodos `mark()` ni `fatal()` en esta clase; por eso `FATAL` no permite ninguno de sus mensajes. `OFF` desactiva explícitamente todas las emisiones, aunque el constructor sigue creando el cliente Axios.

Un mensaje descartado no se serializa, por lo que incluso un objeto circular se omite sin error. Si el nivel permite enviarlo, un objeto circular provoca un `TypeError` antes del POST. Los fallos de transporte se registran directamente con `console.error`, sin invocar `error()` ni generar envíos recursivos.

## Ejecución y pruebas

Desde la raíz del proyecto, instala las dependencias con `pnpm install`, prepara `.env` y levanta PostgreSQL antes de iniciar la aplicación:

```bash
pnpm start:dev
pnpm build
pnpm start:prod
pnpm test --runInBand
pnpm test:cov --runInBand
```

En PowerShell, si la política de ejecución bloquea `pnpm.ps1`, utiliza `pnpm.cmd` para ejecutar los mismos comandos.

Las pruebas están junto al código en `src/**/*.spec.ts`. Jest usa la raíz del proyecto, busca suites en `src` o `test` mediante `(src|test)/.*\.spec\.ts$`, resuelve los imports `src/*` y transforma TypeScript con `ts-jest` y [`tsconfig.spec.json`](../tsconfig.spec.json). Actualmente no existe el directorio `test`. La compilación de producción excluye `**/*spec.ts` mediante `tsconfig.build.json`.

La cobertura se escribe en `coverage` y considera los archivos TypeScript de `src`, excluyendo declaraciones `.d.ts`. Jest exige un mínimo global del 80 % en sentencias, ramas, funciones y líneas.

Las suites comprueban configuración, inyección de dependencias, salud, respuestas y errores, correlación y severidad de logs, filtrado y envío a Loki, Log4js, utilidades, Swagger, cierre por señales y autenticación. Las pruebas de Auth incluyen casos de uso, guards, controladores, DTO, repositorios, entidades, migraciones y tareas de limpieza.

Axios, Log4js, Terminus, Swagger, la aplicación de arranque y las dependencias de persistencia se simulan en las suites correspondientes: no requieren Loki ni PostgreSQL ni abren un servidor HTTP real. Los métodos del servicio JWT se simulan; los casos de uso importan los exports reales de `@nestjs/jwt`, habilitado en `transformIgnorePatterns` junto con `@nestjs/config` y `es-toolkit`. Estas pruebas no validan integraciones remotas, migraciones y rollback reales, rotación de archivos ni el pipeline HTTP completo.

### Escenarios destacados

- `src/modules/shared/shared.module.spec.ts` comprueba la selección exclusiva del logger, su resolución mediante `LOGGER_SERVICE` y el rechazo de modos desconocidos.
- `src/app.module.spec.ts` comprueba la composición de módulos y el mensaje de inicialización.
- `src/main.spec.ts` verifica el buffer de logs, Swagger, validación global, resolución por token, arranque y cierre. Simula señales y `process.exit` para comprobar errores sin terminar Jest.
- `src/app.config.spec.ts` comprueba getters, valores predeterminados, límites del puerto y validación de entornos, niveles y URL de Loki. `src/app.config.module.spec.ts` comprueba la configuración global y su validación.
- `src/modules/shared/interceptors/log.interceptor.spec.ts` comprueba correlación, severidad, respuestas, excepciones, omisión del cuerpo y cancelación de suscripciones.
- `src/modules/shared/services/lokiLogger.service.spec.ts` comprueba los nueve valores de `LOG_LEVEL`, el descarte sin serialización con `OFF`, payloads, salida en consola, errores y envíos concurrentes.
- Las suites de controladores, DTO, errores y utilidades comprueban salud, conversión de errores HTTP, respuestas parciales, trazabilidad, IDs y combinación de esquemas Joi.

La última ejecución verificada, el **11 de noviembre de 2026**, utilizó `pnpm.cmd test:cov --runInBand`: **467 pruebas aprobadas en 57 suites**. Cobertura global: **99,73 % de sentencias**, **97,74 % de ramas**, **99,45 % de funciones** y **99,71 % de líneas**. `LokiLoggerService` alcanza el **100 %** en las cuatro métricas. Consulta el [informe de auditoría](unit-test-audit.md) para el inventario, las correcciones y los límites de la verificación.

Presentan cobertura parcial `SharedModule`, `Log4jsLoggerService`, `MeController` y las ramas de selección de repositorio de `SessionRepository`. Los porcentajes describen esa ejecución y no garantizan resultados tras cambios posteriores. Esta actualización documental no vuelve a ejecutar las pruebas.

El script `pnpm test:e2e` apunta a `test/jest-e2e.json`, que no existe actualmente; requiere incorporar esa configuración y las pruebas correspondientes antes de utilizarlo.

### Hooks de Git

`package.json` incluye `prepare: husky`. El hook `.husky/pre-commit` ejecuta `pnpm test:cov`. `.husky/commit-msg` ejecuta `pnpm exec commitlint --edit "$1"`; `commitlint.config.cjs` extiende `@commitlint/config-conventional`. Los hooks deben estar instalados para que estas comprobaciones se ejecuten al crear un commit.

## Consideraciones del código actual

- El interceptor serializa cuerpos completos cuando `logData=true`; no contiene una función de ocultación de campos.
- Loki filtra por `LOG_LEVEL` antes de enviar; para mensajes admitidos, la salida en consola espera a que finalice cada envío HTTP.
- El cierre no espera explícitamente los envíos pendientes a Loki.
- Auth incluye autenticación y persistencia, pero no ofrece registro, recuperación de contraseña ni CRUD de usuarios y perfiles.
- La revocación por `sessionId` requiere autenticación, pero el caso de uso actual no comprueba que la sesión pertenezca al solicitante.
- El hashing actual de contraseñas utiliza SHA-256, sin salt ni factor de trabajo.
- Los endpoints de salud no incluyen un indicador de PostgreSQL y Swagger aún no declara el esquema Bearer en `main.ts`.
