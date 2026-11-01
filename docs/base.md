# Base NestJS Backend

Documentación del código de `src` y de sus pruebas unitarias. El proyecto ofrece una base HTTP con NestJS, configuración validada, documentación Swagger, comprobaciones de salud y logs mediante Log4js o Loki.

## Estructura

| Archivo                                                                                                         | Responsabilidad                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/main.ts`](../src/main.ts)                                                                                 | Arranque, Swagger, logger, validación, interceptor y cierre por señales.                                                                     |
| [`src/app.module.ts`](../src/app.module.ts)                                                                     | Módulo raíz; importa configuración y servicios compartidos.                                                                                  |
| [`src/app.config.module.ts`](../src/app.config.module.ts)                                                       | Carga y validación de variables con ConfigModule y Joi; exporta AppConfig globalmente.                                                       |
| [`src/app.config.ts`](../src/app.config.ts)                                                                     | Getters tipados sobre ConfigService.getOrThrow y esquema Joi de configuración.                                                               |
| [`src/modules/shared/shared.module.ts`](../src/modules/shared/shared.module.ts)                                 | Importa TerminusModule, registra HealthController y crea el logger seleccionado mediante LOGGER_SERVICE. Exporta ese token y LogInterceptor. |
| [`src/modules/shared/controllers/health.controller.ts`](../src/modules/shared/controllers/health.controller.ts) | Endpoints de vida y disponibilidad.                                                                                                          |
| [`src/modules/shared/interceptors/log.interceptor.ts`](../src/modules/shared/interceptors/log.interceptor.ts)   | Registra ruta, respuesta, estado y duración de las solicitudes.                                                                              |
| [`src/modules/shared/services/log4jsLogger.service.ts`](../src/modules/shared/services/log4jsLogger.service.ts) | Logs a consola y archivos rotativos.                                                                                                         |
| [`src/modules/shared/services/lokiLogger.service.ts`](../src/modules/shared/services/lokiLogger.service.ts)     | Envío HTTP a Loki y salida coloreada en consola.                                                                                             |
| [`src/modules/shared/utils/utils.ts`](../src/modules/shared/utils/utils.ts)                                     | Identificadores de ocho dígitos y combinación de esquemas Joi.                                                                               |
| [`src/@types/express/index.d.ts`](../src/@types/express/index.d.ts)                                             | Extiende Request con logId y logData; no ejecuta lógica en tiempo de ejecución.                                                              |

## Flujo de arranque

`bootstrap()` crea la aplicación con `NestFactory.create(AppModule, { bufferLogs: true })` y obtiene `AppConfig`. Los mensajes iniciales se almacenan hasta instalar el logger. Configura Swagger en `/swagger` con nombre, descripción y versión de la aplicación. `configureLogger()` obtiene el provider mediante `app.get<LoggerService>(LOGGER_SERVICE)` y lo instala con `app.useLogger()`.

La selección del logger está centralizada en `SharedModule`: una factory que recibe `AppConfig` construye `LokiLoggerService` cuando `LOG_MODE=loki` o `Log4jsLoggerService` cuando `LOG_MODE=log4js`. Solo se construye el servicio seleccionado. Un modo distinto lanza `Error('Invalid logger provider')`, además de la validación previa de Joi.

`LOGGER_SERVICE` es un `Symbol` exportado por `shared.module.ts`. `SharedModule` exporta ese token y `LogInterceptor`; las clases concretas de los loggers ya no se registran ni exportan como providers independientes. Para consumir o sustituir el logger en una prueba, debe utilizarse el mismo token importado, no un nuevo `Symbol` con igual descripción.

Registra un `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true` y `transform: true`. Para los endpoints que utilicen DTO con decoradores de validación, rechaza propiedades no permitidas y transforma la entrada según los tipos y configuración del DTO. Los endpoints de salud actuales no reciben DTO.

Instala `LogInterceptor` globalmente y los manejadores de cierre. Finalmente, `app.listen(appConfig.port, callback)` abre el puerto y registra el mensaje de inicio. La función se invoca al cargar `main.ts`.

`AppModule`, `AppConfigModule` y `SharedModule` registran su inicialización mediante `onModuleInit()`.

El cuerpo de `bootstrap()` está protegido por `try/catch`. Los errores que llegan a ese bloque se registran como `Error starting the application:` y provocan `process.exit(1)`. Este manejo es distinto del cierre normal por señales descrito a continuación.

### Cierre

Los manejadores de `SIGINT` y `SIGTERM` se registran con `process.once`. Una bandera compartida evita cerrar dos veces si llegan ambas señales. El cierre espera `app.close()` y establece `process.exitCode=0`; si falla, registra el error y establece `process.exitCode=1`. No fuerza la salida inmediata con `process.exit()` ni espera explícitamente las solicitudes de logs pendientes.

## Configuración

`AppConfigModule` configura `ConfigModule.forRoot` como global. Los valores se validan con Joi mediante el esquema de `app.config.ts`, combinado con `Utils.mergeConfigSchemas()`. La validación conserva variables ajenas (`allowUnknown: true`) e informa todos los errores (`abortEarly: false`). Los getters de `AppConfig` usan `getOrThrow`, por lo que acceder a un valor ausente puede lanzar una excepción incluso si el esquema lo permite para un modo concreto.

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

Ejemplo de configuración local explícita:

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
```

Para utilizar Loki, cambia `LOG_MODE=loki` y define una URL absoluta HTTP o HTTPS en `LOKI_URL`. Joi exige esa variable en modo Loki y rechaza rutas relativas o esquemas diferentes. En modo Log4js se puede omitir `LOKI_URL`, porque la factory no construye el servicio Loki. En modo Loki, `LOG_DIR` y `LOG_NAME` son opcionales y no se crea el logger de archivos. `LOG_LEVEL` es obligatorio y filtra los mensajes en ambos modos. Crea un archivo `.env` a partir del ejemplo anterior; actualmente no existe `example.env` en el proyecto.

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

## Logs de solicitudes

`LogInterceptor` utiliza una instancia `new Logger(LogInterceptor.name)`, de modo que sus mensajes llevan el contexto `LogInterceptor` al logger configurado. `intercept()` obtiene Request y Response del contexto HTTP. Conserva `req.logId` cuando existe; en caso contrario genera uno. Registra `PATH=<método>:<originalUrl o url>`, activa inicialmente `req.logData` y toma el instante inicial.

Al recibir la respuesta, captura `message` si está presente en el objeto o utiliza la respuesta si es una cadena. Serializa el cuerpo como JSON cuando `logData` permanece activado. El controlador puede desactivarlo durante su ejecución.

En errores, usa el estado y cuerpo de `HttpException`; para otras excepciones registra estado 500 y el mensaje genérico `Internal server error`. Vuelve a propagar la excepción original. En errores con `logData=false` omite `DATA`, aunque puede mantener `MESSAGE`.

`finalize()` registra estado y tiempo transcurrido incluso cuando la ejecución falla. Utiliza `log` para 2xx, `warn` para 4xx, `error` para 5xx y `verbose` para los demás estados.

```text
[00000042] PATH=GET:/health/live
[00000042] STATUS=200 TIME=3ms
```

La extensión de Express declara `logId: string` y `logData: boolean`; las declaraciones no asignan valores automáticamente. `Utils.generateLogId()` usa `Math.random`, convierte a entero y rellena a ocho dígitos. Es una etiqueta de correlación, sin garantía de unicidad.

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

Desde la raíz del proyecto:

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

Las suites comprueban configuración, inyección de dependencias, salud, respuestas y errores, correlación y severidad de logs, filtrado y envío a Loki, Log4js, utilidades, Swagger y cierre por señales. Axios, Log4js, Terminus, Swagger y la aplicación de arranque se simulan en las suites correspondientes: no requieren Loki ni abren un servidor HTTP real. Estas pruebas no validan integraciones remotas, rotación real de archivos ni el pipeline HTTP completo.

### Escenarios destacados

- `src/modules/shared/shared.module.spec.ts` comprueba la selección exclusiva del logger, su resolución mediante `LOGGER_SERVICE` y el rechazo de modos desconocidos.
- `src/app.module.spec.ts` comprueba la composición de módulos y el mensaje de inicialización.
- `src/main.spec.ts` verifica el buffer de logs, Swagger, validación global, resolución por token, arranque y cierre. Simula señales y `process.exit` para comprobar errores sin terminar Jest.
- `src/app.config.spec.ts` comprueba getters, valores predeterminados, límites del puerto y validación de entornos, niveles y URL de Loki. `src/app.config.module.spec.ts` comprueba la configuración global y su validación.
- `src/modules/shared/interceptors/log.interceptor.spec.ts` comprueba correlación, severidad, respuestas, excepciones, omisión del cuerpo y cancelación de suscripciones.
- `src/modules/shared/services/lokiLogger.service.spec.ts` comprueba los nueve valores de `LOG_LEVEL`, el descarte sin serialización con `OFF`, payloads, salida en consola, errores y envíos concurrentes.
- Las suites de controladores, DTO, errores y utilidades comprueban salud, conversión de errores HTTP, respuestas parciales, trazabilidad, IDs y combinación de esquemas Joi.

La última ejecución verificada en esta actualización, el **1 de noviembre de 2026**, utilizó `pnpm.cmd test:cov --runInBand`: **148 pruebas aprobadas en 14 suites**. Cobertura global: **99,29 % de sentencias**, **98,82 % de ramas**, **98,41 % de funciones** y **99,22 % de líneas**. `LokiLoggerService` alcanza el **100 %** en las cuatro métricas.

Quedan sin cubrir el log de `SharedModule.onModuleInit()` y el retorno de la guardia redundante dentro de `Log4jsLoggerService.configure()`. Los porcentajes describen esa ejecución y no garantizan resultados tras cambios posteriores.

El script `pnpm test:e2e` apunta a `test/jest-e2e.json`, que no existe actualmente; requiere incorporar esa configuración y las pruebas correspondientes antes de utilizarlo.

### Hooks de Git

`package.json` incluye `prepare: husky`. El hook `.husky/pre-commit` ejecuta `pnpm test:cov`. `.husky/commit-msg` ejecuta `pnpm exec commitlint --edit "$1"`; `commitlint.config.cjs` extiende `@commitlint/config-conventional`. Los hooks deben estar instalados para que estas comprobaciones se ejecuten al crear un commit.

## Consideraciones del código actual

- El interceptor serializa cuerpos completos cuando `logData=true`; no contiene una función de ocultación de campos.
- Loki filtra por `LOG_LEVEL` antes de enviar; para mensajes admitidos, la salida en consola espera a que finalice cada envío HTTP.
- El cierre no espera explícitamente los envíos pendientes a Loki.
- No se implementan módulos de negocio, persistencia ni autenticación en el árbol de `src` documentado.
