# Base NestJS Backend

Base para desarrollar APIs HTTP con **NestJS y TypeScript**. Incluye configuración validada, logs mediante Log4js o Loki, monitoreo de salud, métricas Prometheus, Swagger y pruebas unitarias.

El módulo raíz carga `AppConfigModule`, `HealthModule`, `MetricsModule` y `SharedModule`. La implementación actual no contiene endpoints de autenticación ni conexiones a bases de datos, aunque el manifiesto conserva dependencias relacionadas con JWT y TypeORM.

## Funciones principales

- **Configuración centralizada:** variables de entorno validadas con Joi y disponibles mediante `AppConfig`.
- **Validación HTTP:** `ValidationPipe` global con transformación, lista de propiedades permitidas y rechazo de propiedades adicionales en DTO validados.
- **Logs configurables:** consola y archivos rotativos con Log4js, o envío HTTP a Loki mediante el provider `LOGGER_SERVICE`.
- **Seguimiento HTTP:** `LogRequestInterceptor` registra identificador, ruta, estado, duración y cuerpo de respuesta; los controladores pueden omitir el cuerpo mediante `req.logData=false`.
- **Salud:** endpoints de vida y disponibilidad; en modo Loki, readiness verifica el servicio remoto.
- **Métricas:** métricas predeterminadas de `prom-client`, contador de solicitudes e histograma de duración.
- **Swagger:** documentación de los controladores de salud y métricas en `/swagger`.
- **Ciclo de vida:** manejo de errores de arranque y cierre por señales `SIGINT` y `SIGTERM`.

## Inicio rápido

Necesitas Node.js y pnpm. Para ejecutar localmente con Log4js no necesitas servicios externos.

```bash
pnpm install
```

Copia [`.env.example`](.env.example) como `.env` y configura los valores del entorno. Para usar logs locales:

```dotenv
PORT=3210
ENVIRONMENT=LOCAL
APP_NAME=base-nestjs-backend
APP_DESCRIPTION=API base con NestJS
APP_VERSION=1.0.0
LOG_MODE=log4js
LOG_LEVEL=INFO
LOG_DIR=./logs
LOG_NAME=base-nestjs-backend
```

El archivo de ejemplo selecciona `LOG_MODE=loki`. Si mantienes ese modo, configura `LOKI_URL` con la URL absoluta HTTP(S) de tu instancia de Loki, por ejemplo `http://127.0.0.1:3100`. Para cambiar a logs locales, reemplaza la asignación existente de `LOG_MODE`.

```bash
pnpm start:dev
```

Con `PORT=3210`, abre [Swagger](http://localhost:3210/swagger) o consulta [la comprobación de vida](http://localhost:3210/health/live).

En PowerShell, utiliza `pnpm.cmd` si la política de ejecución bloquea `pnpm.ps1`.

## Variables de entorno

El esquema está definido en [`src/app.config.ts`](src/app.config.ts). La validación convierte valores del entorno, conserva variables ajenas al esquema e informa conjuntamente los errores encontrados.

| Variable          | Valor o requisito                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `PORT`            | Obligatoria; puerto entre 0 y 65535. Usa un puerto fijo para acceder mediante las URLs del ejemplo.          |
| `ENVIRONMENT`     | Obligatoria: `LOCAL`, `DEV`, `QA` o `PROD`.                                                                  |
| `APP_NAME`        | Por defecto: `base-nestjs-backend`.                                                                          |
| `APP_DESCRIPTION` | Opcional; por defecto una cadena vacía.                                                                      |
| `APP_VERSION`     | Por defecto: `1.0.0`.                                                                                        |
| `LOG_MODE`        | Obligatoria: `log4js` o `loki`.                                                                              |
| `LOG_LEVEL`       | Obligatoria: `ALL`, `TRACE`, `DEBUG`, `INFO`, `MARK`, `WARN`, `ERROR`, `FATAL` u `OFF`.                      |
| `LOG_DIR`         | En Log4js, por defecto `./logs`; opcional en Loki.                                                           |
| `LOG_NAME`        | En Log4js, por defecto `base-nestjs-backend`; el logger actual utiliza `APP_NAME` para el nombre de archivo. |
| `LOKI_URL`        | Obligatoria en modo Loki; URL absoluta HTTP(S). Opcional en Log4js.                                          |

## Endpoints

| Método | Ruta            | Comportamiento                                                                                                                 |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/health/live`  | Comprueba que la aplicación responde, sin consultar dependencias externas.                                                     |
| GET    | `/health/ready` | En Log4js no consulta servicios externos. En Loki comprueba `${LOKI_URL}/ready` con timeout de 3000 ms; devuelve 503 si falla. |
| GET    | `/metrics`      | Devuelve métricas en texto compatible con Prometheus; responde 500 si falla su obtención.                                      |
| GET    | `/swagger`      | Interfaz de documentación de la API.                                                                                           |

Los controladores actuales no aplican guards de autenticación. Swagger declara un esquema Bearer mediante `addBearerAuth()`; esa declaración documenta el esquema y no protege los endpoints.

Los endpoints de salud omiten el cuerpo de respuesta en los logs, conservando ruta, estado y duración.

## Métricas Prometheus

[`MetricsService`](src/metrics/metrics.service.ts) utiliza un registro propio de `prom-client` y recolecta las métricas predeterminadas del proceso. El middleware añade:

| Métrica                               | Tipo       | Contenido                                |
| ------------------------------------- | ---------- | ---------------------------------------- |
| `<app>_http_requests_total`           | Contador   | Total de solicitudes registradas.        |
| `<app>_http_request_duration_seconds` | Histograma | Duración de las solicitudes en segundos. |

El prefijo `<app>` corresponde a `APP_NAME` adaptado a un nombre de métrica válido. Las etiquetas son `environment`, `method`, `route` y `status_code`.

- La ruta utiliza el patrón del router, por ejemplo `/users/:id`; si no está disponible, registra `unmatched`.
- Las solicitudes abortadas se registran con `status_code="aborted"`.
- Cada solicitud se registra una sola vez, aunque se reciban eventos de finalización y cierre.
- `GET /metrics` está excluido del middleware para que las consultas de Prometheus no incrementen sus propias métricas HTTP.

Configura tu instancia de Prometheus para consultar `/metrics` en el host y puerto de la aplicación. El repositorio no incluye un despliegue de Prometheus.

## Logging

**Log4js:** escribe en consola y en archivos con base `${LOG_DIR}/${APP_NAME}`, rotación por fecha, tamaño máximo configurado de 2 MiB y 30 respaldos.

**Loki:** filtra por `LOG_LEVEL` y envía cada mensaje a `/loki/api/v1/push`, con etiquetas `app`, `environment` y `level`, y timeout de 5000 ms. Al terminar cada envío escribe en consola `[loki ON]` o `[loki OFF]`. No implementa cola, agrupación ni reintentos; el cierre de la aplicación no espera explícitamente estos envíos.

El interceptor serializa el cuerpo de respuesta cuando `req.logData` está activo. Los identificadores generados tienen ocho dígitos y sirven para correlacionar logs, sin garantía de unicidad.

## Comandos

| Comando                                                                   | Función                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm start:dev`                                                          | Iniciar en desarrollo con recompilación automática.           |
| `pnpm start:debug`                                                        | Iniciar con depurador y recompilación automática.             |
| `pnpm build`                                                              | Compilar el código a `dist`.                                  |
| `pnpm start:prod`                                                         | Ejecutar la compilación existente.                            |
| `pnpm test`                                                               | Ejecutar las pruebas unitarias.                               |
| `pnpm test:watch`                                                         | Ejecutar pruebas en modo observación.                         |
| `pnpm test:cov`                                                           | Ejecutar pruebas y generar cobertura.                         |
| `pnpm exec tsc --project tsconfig.spec.json --noEmit --incremental false` | Verificar tipos, incluidas las pruebas, sin generar archivos. |
| `pnpm lint`                                                               | Ejecutar ESLint con correcciones automáticas.                 |
| `pnpm format`                                                             | Aplicar Prettier al código y las pruebas.                     |

Puedes agregar `--runInBand` a los comandos de Jest para ejecutar las suites en un único proceso.

El script `test:e2e` apunta a `test/jest-e2e.json`, que no existe actualmente. El manifiesto incluye `prepare: husky`, pero no hay hooks de proyecto en `.husky` en el árbol actual.

## Ejecución en producción

Configura las variables del entorno de destino, incluido `ENVIRONMENT=PROD`, y ejecuta:

```bash
pnpm build
pnpm start:prod
```

Si seleccionas Loki, proporciona su URL y disponibilidad.

### Docker

El [Dockerfile](Dockerfile) compila en una etapa separada y ejecuta la aplicación con Node.js 26 como usuario `node`, con dependencias de producción. Utiliza pnpm 12.15.0 y el lockfile existente. No incorpora archivos `.env` a la imagen.

```bash
docker build -t base-nestjs-backend:local .
docker run --rm --name base-nestjs-backend -p 3210:3210 base-nestjs-backend:local
```

La imagen usa por defecto `PORT=3210`, `ENVIRONMENT=PROD`, `LOG_MODE=log4js`, `LOG_LEVEL=INFO` y `LOG_DIR=/app/logs`. Comprueba `/health/live` para determinar su estado de salud. Puedes sobrescribir variables con `-e` o `--env-file .env`; si cambias `PORT`, ajusta también el puerto interno de `-p`.

Para conservar los archivos de log, añade `--mount source=backend-logs,target=/app/logs` a `docker run`. Si utilizas Loki, configura una URL accesible desde el contenedor: `127.0.0.1` identifica al propio contenedor. No se incluye Docker Compose.

## Pruebas y cobertura

Las pruebas `*.spec.ts` están junto al código que verifican. Utilizan Jest, `ts-jest` y mocks para aislar servicios externos: no requieren Loki, bases de datos ni un servidor HTTP real.

Verifican configuración, controladores, métricas, middleware, interceptor, loggers, utilidades, errores, selección de providers, arranque y cierre. Swagger y Terminus se simulan en las suites correspondientes; las pruebas no verifican su integración real.

Última ejecución verificada el **17 de noviembre de 2026**: **115 pruebas exitosas en 19 suites, sin fallos**.

| Métrica    | Cobertura |
| ---------- | --------- |
| Sentencias | 99,73 %   |
| Ramas      | 97,11 %   |
| Funciones  | 100 %     |
| Líneas     | 99,70 %   |

Jest exige un mínimo global del **80 %** en las cuatro métricas. La cobertura considera `src/**/*.ts` y excluye declaraciones `.d.ts` y enums `.enum.ts`. El informe HTML se genera en `coverage/lcov-report/index.html`.

El [informe de resultados](docs/unit-test-results.md) incluye el inventario de archivos, las ramas defensivas pendientes, los problemas encontrados y las recomendaciones.

## Estructura

```text
src/
├── @types/express/       # Extensiones de tipos de Express
├── health/               # Comprobaciones de vida y disponibilidad
├── metrics/              # Servicio, controlador y middleware de métricas
├── shared/
│   ├── controllers/      # Transformación común de excepciones
│   ├── dto/              # Respuesta común
│   ├── errors/           # Errores de repositorio y casos de uso
│   ├── interceptors/     # Registro de solicitudes HTTP
│   ├── services/         # Loggers Log4js y Loki
│   └── utils/            # Identificadores y composición de esquemas
├── app.config.ts         # Configuración y esquema Joi
├── app.config.module.ts  # Carga y validación del entorno
├── app.module.ts         # Composición de módulos
└── main.ts               # Arranque y cierre
```

Consulta la [documentación técnica](docs/base.md) para el detalle de arquitectura, configuración, métricas, logs y límites actuales, y el [informe de pruebas](docs/unit-test-results.md) para los resultados de validación. El archivo `docs/unit-test-audit.md` describe una versión anterior con autenticación y persistencia; sus rutas y cifras no representan el código actual.
