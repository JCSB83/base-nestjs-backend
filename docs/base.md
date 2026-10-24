# Base NestJS Backend

Documentación del código de `src` y de sus pruebas unitarias. El proyecto ofrece una base HTTP con NestJS, configuración validada, documentación Swagger, comprobaciones de salud y logs mediante Log4js o Loki.

## Estructura

| Archivo                                                                                                         | Responsabilidad                                                                                                    |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [`src/main.ts`](../src/main.ts)                                                                                 | Arranque, Swagger, logger, validación, interceptor y cierre por señales.                                           |
| [`src/app.module.ts`](../src/app.module.ts)                                                                     | Módulo raíz; importa configuración y servicios compartidos.                                                        |
| [`src/app.config.module.ts`](../src/app.config.module.ts)                                                       | Carga y validación de variables con ConfigModule y Joi; exporta AppConfig globalmente.                             |
| [`src/app.config.ts`](../src/app.config.ts)                                                                     | Getters tipados sobre ConfigService.getOrThrow.                                                                    |
| [`src/modules/shared/shared.module.ts`](../src/modules/shared/shared.module.ts)                                 | Importa TerminusModule y registra HealthController, ambos loggers y LogInterceptor. Exporta loggers e interceptor. |
| [`src/modules/shared/controllers/health.controller.ts`](../src/modules/shared/controllers/health.controller.ts) | Endpoints de vida y disponibilidad.                                                                                |
| [`src/modules/shared/interceptors/log.interceptor.ts`](../src/modules/shared/interceptors/log.interceptor.ts)   | Registra ruta, respuesta, estado y duración de las solicitudes.                                                    |
| [`src/modules/shared/services/log4jsLogger.service.ts`](../src/modules/shared/services/log4jsLogger.service.ts) | Logs a consola y archivos rotativos.                                                                               |
| [`src/modules/shared/services/lokiLogger.service.ts`](../src/modules/shared/services/lokiLogger.service.ts)     | Envío HTTP a Loki y salida coloreada en consola.                                                                   |
| [`src/modules/shared/utils/utils.ts`](../src/modules/shared/utils/utils.ts)                                     | Identificadores aleatorios de ocho dígitos para correlación de logs.                                               |
| [`src/@types/express/index.d.ts`](../src/@types/express/index.d.ts)                                             | Extiende Request con logId y logData; no ejecuta lógica en tiempo de ejecución.                                    |

## Flujo de arranque

`bootstrap()` crea la aplicación con `NestFactory.create(AppModule)` y obtiene `AppConfig`. Configura Swagger en `/swagger` con nombre, descripción y versión de la aplicación. Selecciona `Log4jsLoggerService` cuando `LOG_MODE=log4js`; en el otro modo validado selecciona `LokiLoggerService`.

Registra un `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true` y `transform: true`. Para los endpoints que utilicen DTO con decoradores de validación, rechaza propiedades no permitidas y transforma la entrada según los tipos y configuración del DTO. Los endpoints de salud actuales no reciben DTO.

Instala `LogInterceptor` globalmente y los manejadores de cierre. Finalmente, `app.listen(appConfig.port, callback)` abre el puerto y registra el mensaje de inicio. La función se invoca al cargar `main.ts`.

`AppModule` y `AppConfigModule` registran su inicialización mediante `onModuleInit()`.

### Cierre

Los manejadores de `SIGINT` y `SIGTERM` se registran con `process.once`. Una bandera compartida evita cerrar dos veces si llegan ambas señales. El cierre espera `app.close()` y establece `process.exitCode=0`; si falla, registra el error y establece `process.exitCode=1`. No fuerza la salida inmediata con `process.exit()` ni espera explícitamente las solicitudes de logs pendientes.

## Configuración

`AppConfigModule` configura `ConfigModule.forRoot` como global. Los valores se validan con Joi. Los getters de `AppConfig` usan `getOrThrow`, por lo que acceder a un valor ausente puede lanzar una excepción incluso si el esquema lo permite para un modo concreto.

| Variable          | Getter           | Validación o valor predeterminado                                                                                         |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PORT`            | `port`           | Puerto numérico obligatorio.                                                                                              |
| `ENVIRONMENT`     | `environment`    | Obligatorio: `LOCAL`, `DEV`, `QA` o `PROD`.                                                                               |
| `APP_NAME`        | `appName`        | `base-nestjs-backend`.                                                                                                    |
| `APP_DESCRIPTION` | `appDescription` | Cadena opcional, admite vacío; por defecto `''`.                                                                          |
| `APP_VERSION`     | `appVersion`     | `1.0.0`.                                                                                                                  |
| `LOG_MODE`        | `logMode`        | Obligatorio: `log4js` o `loki`.                                                                                           |
| `LOG_LEVEL`       | `logLevel`       | Obligatorio: `ALL`, `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `MARK` u `OFF`.                                   |
| `LOG_DIR`         | `logDir`         | En Log4js, por defecto `./logs`; en Loki admite vacío, null o ausencia.                                                   |
| `LOG_NAME`        | `logName`        | En Log4js, por defecto `base-nestjs-backend`; en Loki es opcional. No se usa para construir el nombre del archivo actual. |
| `LOKI_URL`        | `lokiURL`        | En Loki, el esquema asigna `base-nestjs-backend` si falta; no valida formato URL. En Log4js es opcional.                  |

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

Para utilizar Loki, cambia `LOG_MODE=loki` y define una URL HTTP válida en `LOKI_URL`. Ambos loggers están registrados como providers y se construyen aunque solo uno se seleccione como logger global. Por ello, conviene conservar explícitamente las variables de ambos servicios: la opcionalidad del esquema no garantiza que sus constructores toleren valores ausentes. `example.env` actualmente repite `LOG_MODE`; deja una sola asignación en tu configuración.

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

`LogInterceptor.intercept()` obtiene Request y Response del contexto HTTP. Conserva `req.logId` cuando existe; en caso contrario genera uno. Registra `PATH=<método>:<originalUrl o url>`, activa inicialmente `req.logData` y toma el instante inicial.

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

Crea un cliente Axios con `baseURL=LOKI_URL`, timeout de 5000 ms y contenido JSON. Cada llamada envía un POST independiente a `/loki/api/v1/push` con las etiquetas `app`, `environment` y `level`. El timestamp se expresa como una cadena en nanosegundos a partir de `Date.now()`, con precisión efectiva de milisegundos.

El mensaje se serializa como `{ message, params }`. Si el mensaje es un `Error`, incluye también `stack`. Los métodos devuelven el control sin esperar la petición; no hay cola, agrupación ni reintentos implementados.

Cuando la petición termina, `finally` imprime fecha local, estado de envío, nivel y mensaje con colores ANSI. Una petición resuelta muestra `[loki ON]`; una rechazada registra el error directamente con `console.error` y muestra `[loki OFF]`. Estas etiquetas describen ese envío, no un estado global de conexión. La consola se escribe en todos los entornos y puede demorarse mientras la petición está pendiente. Los envíos concurrentes pueden aparecer fuera de orden.

Este servicio no aplica filtrado por `LOG_LEVEL`. Tampoco utiliza su propio método `error()` para fallos de transporte, evitando generar envíos recursivos.

## Ejecución y pruebas

Desde la raíz del proyecto:

```bash
yarn start:dev
yarn build
yarn start:prod
yarn test --runInBand
yarn test:cov --runInBand
```

En PowerShell, si la política de ejecución bloquea `yarn.ps1`, utiliza `yarn.cmd` para ejecutar los mismos comandos.

Las pruebas están en [`test`](../test). Jest usa la raíz del proyecto, descubre `test/**/*.spec.ts`, resuelve los imports `src/*` y transforma TypeScript con [`test/tsconfig.json`](../test/tsconfig.json). La compilación de producción excluye `test` mediante `tsconfig.build.json`. La cobertura se escribe en `coverage` y considera los archivos TypeScript de `src`, excluyendo declaraciones `.d.ts`.

Las suites comprueban getters y validación de configuración, resolución de dependencias de los módulos, salud, correlación y severidad de logs, envío y errores de Loki, configuración y delegación de Log4js, generación de IDs, selección del logger, configuración de Swagger, solicitud de apertura del puerto y cierre por señales. Los transportes, salidas y aplicación de arranque se simulan; no requieren Loki, no abren un servidor real y no validan una integración remota. Terminus se simula en `test/setup.ts` y Swagger en la prueba de arranque: se comprueba cómo los utiliza la aplicación, no su implementación interna. Las declaraciones de tipos se comprueban mediante compilación y no tienen pruebas ejecutables propias.

## Consideraciones del código actual

- El inicio de `main.ts` no incorpora un `catch` explícito para errores de `bootstrap()`.
- El esquema de Loki admite como valor predeterminado una cadena que no es una URL HTTP; define `LOKI_URL` explícitamente.
- El interceptor serializa cuerpos completos cuando `logData=true`; no contiene una función de ocultación de campos.
- Los providers de ambos loggers se construyen aunque solo uno se use globalmente.
- No se implementan módulos de negocio, persistencia ni autenticación en el árbol de `src` documentado.
