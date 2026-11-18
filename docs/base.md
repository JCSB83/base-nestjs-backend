# Base NestJS Backend: documentación técnica

Revisada el **17 de noviembre de 2026** a partir del código actual. La aplicación ofrece una base HTTP con NestJS, configuración validada, Swagger, salud, métricas Prometheus y logs mediante Log4js o Loki.

Para instalar y ejecutar el proyecto, consulta el [README](../README.md). La implementación actual no incluye autenticación, persistencia, migraciones ni tareas programadas. El manifiesto conserva `@nestjs/typeorm`, pero no registra conexiones ni repositorios de base de datos.

Las dependencias declaradas en [package.json](../package.json) incluyen NestJS 12, Express 5, `@prometheus-io/client` 0.16, TypeScript 6 y Jest 30. Las versiones resueltas se fijan en el lockfile de pnpm.

## Arquitectura y responsabilidades

| Archivo                                                                             | Responsabilidad                                                                        |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [main.ts](../src/main.ts)                                                           | Arranque, Swagger, logger, validación global, interceptor y cierre por señales.        |
| [app.module.ts](../src/app.module.ts)                                               | Importa AppConfigModule, HealthModule, MetricsModule y SharedModule.                   |
| [app.config.module.ts](../src/app.config.module.ts)                                 | Carga y valida el entorno; exporta AppConfig globalmente.                              |
| [app.config.ts](../src/app.config.ts)                                               | Getters sobre ConfigService y esquema Joi.                                             |
| [health.module.ts](../src/health/health.module.ts)                                  | Importa TerminusModule y registra HealthController.                                    |
| [health.controller.ts](../src/health/health.controller.ts)                          | Comprobaciones de vida y disponibilidad.                                               |
| [metrics.module.ts](../src/metrics/metrics.module.ts)                               | Registra servicio, controlador y middleware; excluye GET /metrics de la medición HTTP. |
| [metrics.service.ts](../src/metrics/metrics.service.ts)                             | Registro Prometheus, contadores e histogramas.                                         |
| [metrics.middleware.ts](../src/metrics/metrics.middleware.ts)                       | Mide solicitudes terminadas y abortadas.                                               |
| [metrics.controller.ts](../src/metrics/metrics.controller.ts)                       | Expone las métricas como texto.                                                        |
| [shared.module.ts](../src/shared/shared.module.ts)                                  | Selecciona el logger y exporta LOGGER_SERVICE y LogRequestInterceptor.                 |
| [log-request.interceptor.ts](../src/shared/interceptors/log-request.interceptor.ts) | Registra ruta, respuesta, estado y duración.                                           |
| [log4jsLogger.service.ts](../src/shared/services/log4jsLogger.service.ts)           | Logs a consola y archivos rotativos.                                                   |
| [lokiLogger.service.ts](../src/shared/services/lokiLogger.service.ts)               | Filtrado de niveles, envío HTTP a Loki y salida en consola.                            |
| [common.controller.ts](../src/shared/controllers/common.controller.ts)              | Convierte errores en HttpException con ResponseDto.                                    |
| [response.dto.ts](../src/shared/dto/response.dto.ts)                                | Inicializa una respuesta común a partir de propiedades parciales.                      |
| [utils.ts](../src/shared/utils/utils.ts)                                            | Genera identificadores y combina esquemas Joi.                                         |
| [Declaraciones Express](../src/@types/express/index.d.ts)                           | Extiende Request con logId, logData, userId, user y sessionId.                         |

Las declaraciones de Express solo describen tipos: no asignan valores ni implementan autenticación. Las pruebas se encuentran junto a cada archivo en `*.spec.ts`.

El alias `@/*` apunta a `src/*` en [tsconfig.json](../tsconfig.json). Jest configura esa misma correspondencia en [jest.config.ts](../jest.config.ts), junto con `src/*` y una regla para imports relativos terminados en `.js`.

## Arranque y cierre

`bootstrap()` se ejecuta al cargar `main.ts`:

1. Crea la aplicación con `NestFactory.create(AppModule, { bufferLogs: true })`.
2. Obtiene `AppConfig`.
3. Configura Swagger con `APP_NAME`, `APP_DESCRIPTION`, `APP_VERSION` y `addBearerAuth()`.
4. Obtiene `LOGGER_SERVICE` e instala el logger mediante `app.useLogger()`.
5. Instala el `ValidationPipe` y el `LogRequestInterceptor` globales.
6. Registra los manejadores de cierre.
7. Escucha en `PORT` y registra el mensaje de inicio.

El pipe utiliza `whitelist: true`, `forbidNonWhitelisted: true` y `transform: true`. En endpoints que reciban DTO con decoradores de validación, rechaza propiedades no permitidas y transforma la entrada conforme al DTO. Los endpoints actuales de salud y métricas no reciben DTO de entrada.

Los errores que llegan al bloque `catch` del arranque se registran como `Error starting the application:` y provocan `process.exit(1)`.

Los módulos AppModule, AppConfigModule, HealthModule, MetricsModule y SharedModule registran su inicialización mediante `onModuleInit()`.

El arranque actual no registra ObserveModule ni pasa ObserveInstrument a NestFactory; la instrumentación HTTP propia reside en MetricsMiddleware y LogRequestInterceptor.

### Selección del logger

La factory de SharedModule recibe AppConfig y construye exclusivamente el servicio seleccionado:

| LOG_MODE | Servicio            |
| -------- | ------------------- |
| `log4js` | Log4jsLoggerService |
| `loki`   | LokiLoggerService   |

Un valor diferente provoca `Error('Invalid logger provider')`, además de ser rechazado por Joi.

`LOGGER_SERVICE` es un `Symbol` exportado por SharedModule. Para resolver o sustituir el provider debe importarse ese mismo token; crear otro símbolo con la misma descripción no identifica al mismo provider. Las clases concretas no se registran ni exportan como providers independientes.

### Señales de cierre

Los manejadores de SIGINT y SIGTERM se registran con `process.once`. Una bandera compartida evita ejecutar el cierre dos veces si llegan ambas señales.

El cierre espera `app.close()` y establece `process.exitCode=0`. Si falla, registra `Error closing application` y establece `process.exitCode=1`. No fuerza una salida inmediata ni espera explícitamente los envíos pendientes a Loki.

## Configuración

AppConfigModule utiliza `ConfigModule.forRoot` como módulo global y valida el entorno con `appConfigSchema`, compuesto mediante `Utils.mergeConfigSchemas()`.

La validación conserva variables ajenas al esquema (`allowUnknown: true`) e informa todos los errores (`abortEarly: false`). Un fallo produce un error con prefijo `Config validation error:`. Los getters de AppConfig delegan en `ConfigService.getOrThrow`; los tipos genéricos de los getters no sustituyen la validación de Joi.

| Variable          | Getter           | Requisito o valor predeterminado                                                                             |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `PORT`            | `port`           | Obligatoria; entero entre 0 y 65535.                                                                         |
| `ENVIRONMENT`     | `environment`    | Obligatoria: LOCAL, DEV, QA o PROD.                                                                          |
| `APP_NAME`        | `appName`        | Por defecto: base-nestjs-backend.                                                                            |
| `APP_DESCRIPTION` | `appDescription` | Opcional; admite vacío y su valor por defecto es una cadena vacía.                                           |
| `APP_VERSION`     | `appVersion`     | Por defecto: 1.0.0.                                                                                          |
| `LOG_MODE`        | `logMode`        | Obligatoria: log4js o loki.                                                                                  |
| `LOG_LEVEL`       | `logLevel`       | Obligatoria: ALL, TRACE, DEBUG, INFO, MARK, WARN, ERROR, FATAL u OFF.                                        |
| `LOG_DIR`         | `logDir`         | En Log4js, por defecto ./logs; en Loki admite vacío, null o ausencia.                                        |
| `LOG_NAME`        | `logName`        | En Log4js, por defecto base-nestjs-backend; opcional en Loki. El logger actual usa APP_NAME para el archivo. |
| `LOKI_URL`        | `lokiURL`        | Obligatoria en Loki: URL absoluta HTTP(S). En Log4js admite vacío, null o ausencia.                          |

Copia [`.env.example`](../.env.example) como `.env`. El archivo de ejemplo selecciona Loki; para ejecutar sin servicios externos, cambia su asignación de LOG_MODE a log4js:

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
```

Para Loki, selecciona `LOG_MODE=loki` y define, por ejemplo, `LOKI_URL=http://127.0.0.1:3100`. En ese modo no se construye el logger de archivos. LOG_LEVEL filtra mensajes en ambos modos.

## Endpoints y Swagger

| Método y ruta       | Resultado                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GET /health/live`  | Ejecuta health.check([]), sin consultar dependencias externas.                                                                 |
| `GET /health/ready` | En Log4js usa una lista vacía de indicadores. En Loki consulta `${LOKI_URL}/ready` con el indicador loki y timeout de 3000 ms. |
| `GET /metrics`      | Responde con las métricas del registro Prometheus como texto; ante un error responde 500.                                      |
| `GET /swagger`      | Interfaz de documentación de la API.                                                                                           |

HealthController usa el tag Swagger `Health`, con las operaciones `healthLive` y `healthReady`. MetricsController usa el tag `Metrics`, la operación `getMetrics` y documenta las respuestas 200 y 500 como cadenas, con contenido `text/plain; version=0.0.4; charset=utf-8`.

El esquema Bearer declarado en Swagger no aplica autenticación: no hay guards en los controladores actuales.

### Salud

Ambos métodos asignan `req.logData=false`, de modo que el interceptor omite el cuerpo de respuesta, pero conserva ruta, estado y duración.

En modo Loki, live puede responder satisfactoriamente mientras ready falla por la dependencia remota. El fallo de readiness devuelve 503 según el comportamiento de Terminus documentado por el controlador. No hay indicadores de bases de datos.

### Respuesta de métricas

MetricsController obtiene el tipo de contenido desde MetricsService, lo asigna a la respuesta de Express y termina la respuesta mediante `res.end(await getMetrics())`.

Si falla, registra el mensaje `Error al intentar obtener metricas`, junto con mensaje y stack del error, y responde con estado 500 y texto `Error interno del servidor`. No utiliza ResponseDto.

## Métricas

### Registro y servicio

MetricsService importa `@prometheus-io/client`, crea un `client.Registry` propio y llama a `collectDefaultMetrics({ register })`. Expone el contenido mediante `getMetrics()` y su tipo MIME mediante `getContentType()`. Los mapas de métricas utilizan `Counter<string>` e `Histogram<string>` para sus etiquetas.

| Método                                            | Comportamiento                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `incrementCounter(name, help, labels, value = 1)` | Crea o reutiliza un contador por nombre y lo incrementa con las etiquetas y el valor recibidos. |
| `observeHistogram(name, help, labels, value)`     | Crea o reutiliza un histograma por nombre y registra el valor.                                  |

El servicio guarda por separado contadores, histogramas y sus nombres de etiquetas. Ordena las claves antes de compararlas, por lo que cambiar el orden de las propiedades no crea otra métrica. Reutilizar una métrica con un conjunto distinto de etiquetas lanza un error; cambiar los valores de las etiquetas está permitido.

Los buckets de los histogramas son:

```text
0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
```

En el histograma HTTP representan segundos.

### Middleware HTTP

MetricsModule aplica MetricsMiddleware a `forRoutes('*')` y excluye `GET metrics`. Así, las consultas al endpoint de métricas no incrementan sus propias métricas HTTP.

El middleware toma el instante inicial con `process.hrtime.bigint()`, registra listeners de una sola ejecución para `finish` y `close`, y llama a `next()`.

- `finish` registra una solicitud terminada.
- `close` registra una solicitud abortada si `res.writableFinished` es falso.
- Una bandera `recorded` impide registrar dos veces una misma solicitud.
- La duración se obtiene convirtiendo la diferencia de nanosegundos a segundos.

El nombre de aplicación se adapta reemplazando caracteres ajenos a `a-zA-Z0-9_:` por guiones bajos y anteponiendo un guion bajo si comienza por un dígito.

| Métrica                               | Descripción              |
| ------------------------------------- | ------------------------ |
| `<app>_http_requests_total`           | Contador de solicitudes. |
| `<app>_http_request_duration_seconds` | Histograma de duración.  |

Ambas métricas utilizan:

| Etiqueta      | Valor                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `environment` | AppConfig.environment.                                                 |
| `method`      | Método HTTP de la solicitud.                                           |
| `route`       | req.baseUrl + req.route.path, o unmatched si no existe el patrón.      |
| `status_code` | Estado HTTP convertido a cadena, o aborted para solicitudes abortadas. |

Los errores al incrementar u observar se registran con Logger.error y se absorben para evitar que una falla de métricas interrumpa el proceso. No se reintenta el registro.

Prometheus debe configurarse externamente para consultar `/metrics`. El repositorio no incluye su despliegue.

## Logs de solicitudes

LogRequestInterceptor crea un logger con contexto `LogRequestInterceptor`. Conserva `req.logId` si tiene valor; de lo contrario genera uno mediante Utils. Registra `PATH=<método>:<originalUrl o url>`, establece inicialmente `req.logData=true` y toma el tiempo inicial con Date.now().

Al recibir una respuesta:

- Si logData está desactivado, omite la captura del cuerpo.
- Si el objeto contiene message, utiliza esa propiedad como mensaje.
- Si la respuesta es una cadena, la utiliza como mensaje.
- Serializa el cuerpo con JSON.stringify cuando logData permanece activo.

En errores, utiliza el estado y cuerpo de HttpException. Para otras excepciones registra estado 500 y el cuerpo genérico `{ message: 'Internal server error' }`. Propaga la excepción original. Con logData desactivado omite DATA, aunque puede conservar MESSAGE.

`finalize()` registra estado y duración tanto en éxito como en error. Usa log para 2xx, warn para 4xx, error para 5xx y verbose para los demás estados.

```text
[00000042] PATH=GET:/health/live
[00000042] STATUS=200 TIME=3ms
```

La medición del interceptor describe la ejecución del observable del controlador. La medición del middleware describe los eventos de finalización o cierre de la respuesta HTTP; son puntos de medición diferentes.

## Log4jsLoggerService

Implementa LoggerService: log delega en info, verbose en trace, y error, warn y debug conservan su nombre. Reenvía el mensaje y todos los parámetros adicionales.

Una bandera estática evita configurar Log4js más de una vez por carga del módulo. El logger se obtiene usando APP_NAME. Se configuran un appender stdout y otro dateFile:

| Opción                      | Valor                                 |
| --------------------------- | ------------------------------------- |
| Base del archivo            | `${LOG_DIR}/${APP_NAME}`              |
| Patrón                      | yyyy-MM-dd.log                        |
| Separador                   | -                                     |
| Fecha incluida en el nombre | Siempre                               |
| Tamaño máximo configurado   | 2 MiB                                 |
| Respaldos                   | 30                                    |
| Compresión                  | Desactivada                           |
| Layout                      | `%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %m` |

La categoría default aplica LOG_LEVEL a ambos destinos. LOG_NAME está declarado en la configuración, pero no participa en la construcción del nombre del archivo.

## LokiLoggerService

Crea un cliente Axios con baseURL igual a LOKI_URL, timeout de 5000 ms y contenido JSON. Cada mensaje admitido genera un POST a `/loki/api/v1/push` con etiquetas app, environment y level.

El timestamp se construye como `${Date.now()}000000`: expresa nanosegundos con precisión efectiva de milisegundos. El contenido se serializa como `{ message, params }`; para instancias de Error incluye message, stack y params.

Los métodos devuelven el control sin esperar la petición. No existe cola, agrupación ni reintentos.

Al finalizar el envío, escribe fecha local, nivel, mensaje y estado con colores ANSI. Una petición resuelta muestra `[loki ON]`; una rechazada se registra directamente con console.error y muestra `[loki OFF]`. Estas etiquetas describen ese envío, no un estado global de conexión. La salida en consola puede demorarse y aparecer fuera de orden entre envíos concurrentes.

### Filtrado por nivel

El filtro se aplica antes de serializar, enviar HTTP o escribir en consola.

| LOG_LEVEL   | Métodos que emiten                         |
| ----------- | ------------------------------------------ |
| ALL o TRACE | verbose, debug, log, warn, error           |
| DEBUG       | debug, log, warn, error                    |
| INFO        | log, warn, error                           |
| MARK o WARN | warn, error                                |
| ERROR       | error                                      |
| FATAL u OFF | Ninguno de los cinco métodos implementados |

La prioridad es ALL < TRACE < DEBUG < INFO < MARK < WARN < ERROR < FATAL < OFF. No hay métodos mark ni fatal. OFF evita emisiones, pero el constructor sigue creando el cliente Axios.

Un objeto circular admitido por el filtro provoca un error de serialización antes del POST. Los fallos HTTP se registran con console.error, sin invocar el método error del servicio para evitar recursión.

## Respuestas, errores y utilidades

### ResponseDto y CommonController

ResponseDto inicializa statusCode en 0 y copia con Object.assign las propiedades parciales del constructor. Declara logId, title, message, error y data como opcionales. No impone un formato global a todas las respuestas.

CommonController.getHttpException transforma errores de esta manera:

| Error                             | Estado | Contenido                                                |
| --------------------------------- | ------ | -------------------------------------------------------- |
| UseCaseError con nivel Validation | 400    | message recibido, logId y mensaje del error.             |
| Otro UseCaseError                 | 500    | message recibido, logId y mensaje del error.             |
| Cualquier otro valor              | 500    | Mensaje fijo login failed y error internal server error. |

El mensaje fijo `login failed` es el comportamiento actual y está documentado por las pruebas; no corresponde a un endpoint de login existente.

[UseCaseError](../src/shared/errors/usecase.error.ts) y [RepositoryError](../src/shared/errors/repository.error.ts) extienden Error, conservan una causa opcional en innerError y registran el mensaje con Logger.error. UseCaseError utiliza por defecto el nivel Unknown.

### Utils

- `generateLogId()`: genera un entero aleatorio y lo completa con ceros hasta ocho dígitos. Sirve para correlación, sin garantía de unicidad.
- `mergeConfigSchemas(...schemas)`: concatena los esquemas Joi sobre un objeto inicial vacío y conserva sus restricciones.

## Ejecución y validación

Desde la raíz, instala dependencias con `pnpm install` y prepara el entorno. En Log4js no necesitas servicios externos; en Loki debes disponer del servicio configurado.

```bash
pnpm start:dev
pnpm build
pnpm start:prod
```

Para pruebas y comprobaciones estáticas:

```bash
pnpm test
pnpm test:cov
pnpm exec tsc --project tsconfig.spec.json --noEmit --incremental false
pnpm exec eslint "src/**/*.spec.ts"
```

En PowerShell puedes utilizar pnpm.cmd si la política de ejecución bloquea pnpm.ps1. Para ejecutar las suites en un único proceso, agrega `--runInBand` a los comandos de Jest.

La configuración de Jest está en [jest.config.ts](../jest.config.ts), separada de package.json. Busca pruebas en src o test, resuelve imports `src/*` y `@/*`, y transforma TypeScript con ts-jest y [tsconfig.spec.json](../tsconfig.spec.json). Este último utiliza CommonJS para las pruebas. [tsconfig.build.json](../tsconfig.build.json) excluye los archivos de pruebas de la compilación de producción.

Los scripts de pruebas ejecutan Jest mediante `node --experimental-vm-modules`. Node puede emitir una advertencia de funcionalidad experimental; en la ejecución verificada esa advertencia no impide que las pruebas pasen.

La comprobación independiente con `tsc --project tsconfig.spec.json --noEmit --incremental false` falla actualmente con TS5107: `moduleResolution: node` corresponde a la resolución obsoleta node10 en TypeScript 6. Las pruebas de Jest pasan, pero esto no equivale a una comprobación global de tipos satisfactoria. La configuración debe migrarse; esta actualización documental no modifica tsconfig.

El script test:e2e apunta a test/jest-e2e.json, que no existe.

### Imagen Docker

El [Dockerfile](../Dockerfile) utiliza Node.js 26 sobre Debian Bookworm slim y pnpm 12.15.0. Instala con `--frozen-lockfile`, compila mediante `pnpm build` y elimina las dependencias de desarrollo antes de copiarlas a la etapa final. Husky está desactivado durante la instalación; el proceso de poda no ejecuta scripts de ciclo de vida.

La imagen final contiene package.json, node_modules y dist. Arranca directamente con `node dist/main.js` como usuario `node`, recibe SIGTERM para el cierre y comprueba `/health/live` cada 30 segundos. El directorio `/app/logs` pertenece al usuario de la aplicación.

[.dockerignore](../.dockerignore) excluye dependencias locales, compilaciones, pruebas, logs, archivos `.env` y metadatos del contexto. La configuración se proporciona al ejecutar el contenedor. Los valores predeterminados son PORT=3210, ENVIRONMENT=PROD, LOG_MODE=log4js, LOG_LEVEL=INFO y LOG_DIR=/app/logs.

Consulta los comandos de construcción y ejecución en el [README](../README.md#docker). No se incluye Docker Compose.

### Hooks de Git

El manifiesto incluye `prepare: husky`. El hook [pre-commit](../.husky/pre-commit) ejecuta `pnpm test` y [commit-msg](../.husky/commit-msg) ejecuta `pnpm exec commitlint --edit "$1"`, con la configuración de [commitlint.config.cjs](../commitlint.config.cjs). El hook de pre-commit ejecuta las pruebas sin solicitar cobertura; para comprobar los umbrales utiliza `pnpm test:cov`.

### Alcance y resultados de las pruebas

La ejecución de `pnpm.cmd test:cov --runInBand`, verificada al actualizar este documento el **17 de noviembre de 2026**, aprobó **115 pruebas en 19 suites**, con **0 fallos**.

| Métrica    | Cobertura |
| ---------- | --------- |
| Sentencias | 99,73 %   |
| Ramas      | 97,11 %   |
| Funciones  | 100 %     |
| Líneas     | 99,71 %   |

Los umbrales globales de Jest se mantienen en 80 %. La cobertura considera archivos TypeScript de src y excluye declaraciones .d.ts y enums .enum.ts. El informe HTML se genera en coverage/lcov-report/index.html.

Las suites verifican controladores, configuración, servicios, middleware, interceptor, errores, utilidades, selección del logger y ciclo de vida. Simulan Axios, Log4js, `@prometheus-io/client`, Swagger, Terminus y la aplicación de arranque donde corresponde. No abren servidores ni realizan conexiones remotas o escrituras reales de logs.

### Aislamiento de dependencias en las pruebas

- `app.config.spec.ts` conserva la clase AppConfig y el esquema Joi reales. Simula únicamente ConfigService de `@nestjs/config` y proporciona un mock de getOrThrow para comprobar los getters y la propagación de errores. Sus 24 casos verifican también valores predeterminados, requisitos y límites de configuración.
- Las suites de los loggers, HealthController, MetricsMiddleware, MetricsModule y SharedModule simulan `@/app.config`. Esto evita cargar indirectamente `@nestjs/config` mientras se prueba el comportamiento de cada unidad con valores de configuración controlados.
- Estos mocks evitan el error `ReferenceError: exports is not defined` observado al cargar la dependencia ESM con la configuración actual de Jest. No verifican la integración real con ConfigService.
- `metrics.service.spec.ts` simula el mismo paquete que importa producción: `@prometheus-io/client`. Los mocks de Counter e Histogram especifican el genérico `<string>` para coincidir con los tipos de etiquetas del servicio.
- `lokiLogger.service.spec.ts` simula Axios y la consola, fija el reloj y espera la cadena de promesas antes de comprobar los efectos del envío. Sus 15 casos cubren niveles, serialización y errores HTTP sin contactar con Loki.

No quedan métodos completos sin cobertura. Permanecen las alternativas defensivas de los mapas de etiquetas en MetricsService y el retorno de configure cuando Log4js ya está configurado, que el constructor evita alcanzar.

Consulta el [informe de resultados](unit-test-results.md) para el inventario original y las limitaciones. Ese informe conserva las dependencias, líneas y resultados de la primera generación de pruebas; la ejecución y los ajustes descritos aquí reflejan el estado actualizado. El archivo unit-test-audit.md corresponde a una versión anterior del proyecto.

## Límites actuales

- Swagger declara Bearer, pero los endpoints actuales no aplican autenticación.
- El interceptor serializa cuerpos completos cuando logData está activo y no oculta campos.
- MetricsController lee el identificador de res.locals.logId; el interceptor lo asigna a req.logId. El código actual no copia ese valor a res.locals, por lo que el log de error de métricas puede mostrar undefined.
- El cierre no espera explícitamente los envíos pendientes a Loki.
- CommonController conserva el mensaje fijo login failed para errores inesperados.
- Las pruebas unitarias no validan el documento OpenAPI real, la integración de Terminus, el pipeline HTTP completo, la rotación de archivos ni la recolección real de Prometheus.

Estas observaciones describen el código vigente; no se modificó su comportamiento al actualizar la documentación.
