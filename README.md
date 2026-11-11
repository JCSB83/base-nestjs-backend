# Base NestJS Backend

Base para desarrollar APIs HTTP con **NestJS y TypeScript**, autenticación JWT y sesiones persistentes en **PostgreSQL**. Incluye configuración validada, logs, monitoreo de salud y pruebas unitarias.

## Funciones principales

- **Configuración centralizada:** variables de entorno validadas con Joi y disponibles mediante `AppConfig` y `AuthConfig`.
- **Autenticación:** login, renovación de tokens, usuario actual, consulta y revocación de sesiones, logout y limpieza programada de registros expirados.
- **Persistencia:** TypeORM, migraciones y entidades de usuarios, perfiles, permisos, sesiones y refresh tokens.
- **Validación de solicitudes:** `ValidationPipe` global con transformación de datos y rechazo de propiedades no permitidas en DTO validados.
- **Logs configurables:** selección entre Log4js, con consola y archivos rotativos, o Loki, mediante el provider `LOGGER_SERVICE`.
- **Seguimiento HTTP:** interceptor que registra identificador, ruta, estado, duración y cuerpo de respuesta configurable.
- **Comprobaciones de salud:** `/health/live` y `/health/ready`; en modo Loki, disponibilidad del servicio remoto.
- **Documentación de API:** interfaz Swagger en `/swagger`.
- **Ciclo de vida:** manejo de errores de arranque y cierre por señales `SIGINT` y `SIGTERM`.
- **Pruebas y herramientas:** Jest con cobertura, ESLint, Prettier y hooks de Husky para pruebas y validación de mensajes de commit.

## Inicio rápido

Necesitas Node.js, pnpm y PostgreSQL. Para levantar la base de desarrollo incluida, utiliza Docker Compose:

```bash
pnpm install
docker compose -f docker/postgresql-auth/docker-compose.yml up -d
```

Crea `.env` a partir de [`.env.example`](.env.example). La configuración de autenticación es obligatoria porque `AppModule` importa `AuthModule`. Para usar PostgreSQL del Compose y logs locales, configura:

```dotenv
PORT=3210
ENVIRONMENT=LOCAL
LOG_MODE=log4js
LOG_LEVEL=INFO

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

Sustituye los secretos JWT por valores propios. Las expiraciones se expresan en **segundos**: `900` equivale a 15 minutos y `3600` a una hora. Ajusta los valores de `.env.example`, cuyos comentarios actuales no coinciden con las duraciones numéricas.

Deja una sola asignación de `LOG_MODE`. Si eliges `loki`, configura también `LOKI_URL` con una URL absoluta HTTP(S). Luego inicia la app:

```bash
pnpm start:dev
```

El servidor escucha en el puerto definido por `PORT`. Con `PORT=3210`, puedes consultar `http://localhost:3210/health/live` y abrir `http://localhost:3210/swagger`.

La base debe estar disponible al arrancar. Con `AUTH_DATABASE_MIGRATIONSRUN=true`, TypeORM aplica las migraciones pendientes; mantén `AUTH_DATABASE_SYNCRONIZE=false` para gestionar el esquema con migraciones. La carga inicial crea `admin@base.com` con contraseña `password123`: sustituye esas credenciales al provisionar un entorno real.

## API

| Método | Ruta | Acceso |
| ------ | ---- | ------ |
| GET | `/health/live` | Público; comprueba que la app responde. |
| GET | `/health/ready` | Público; comprueba Loki si está seleccionado. |
| GET | `/swagger` | Documentación de API. |
| POST | `/api/v1/auth/login` | Público; cuerpo con `email` y `password`. |
| POST | `/api/v1/auth/refresh` | Cuerpo con `token` de renovación. |
| GET | `/api/v1/auth/me` | Access token. |
| GET | `/api/v1/auth/sessions` | Access token. |
| POST | `/api/v1/auth/logout` | Access token. |
| POST | `/api/v1/auth/logout-all` | Access token. |
| DELETE | `/api/v1/auth/sessions/:sessionId` | Access token. |

Las rutas protegidas requieren `Authorization: Bearer <accessToken>`. Los endpoints de salud no comprueban PostgreSQL. Swagger todavía no declara el esquema Bearer en `main.ts`.

## Ejecución en producción

Configura las variables del entorno de destino, incluidos PostgreSQL, secretos JWT y `ENVIRONMENT=PROD`, y ejecuta:

```bash
pnpm build
pnpm start:prod
```

El Compose incluido levanta únicamente PostgreSQL. El árbol de trabajo actual no contiene un `Dockerfile` para construir la imagen de la aplicación.

## Comandos

| Comando                     | Función                                             |
| --------------------------- | --------------------------------------------------- |
| `pnpm start:dev`            | Iniciar en desarrollo con recompilación automática. |
| `pnpm build`                | Compilar el código a `dist`.                        |
| `pnpm start:prod`           | Ejecutar la compilación existente.                  |
| `pnpm test --runInBand`     | Ejecutar las pruebas unitarias.                     |
| `pnpm test:cov --runInBand` | Ejecutar pruebas y generar cobertura.               |

En PowerShell, puedes usar `pnpm.cmd` si la política de ejecución bloquea `pnpm.ps1`.

## Pruebas

Las pruebas `.spec.ts` están junto al código en `src/` y utilizan mocks; no requieren PostgreSQL ni Loki. Jest exige una cobertura global mínima del 80 % en sentencias, ramas, funciones y líneas. El informe HTML se genera en `coverage/lcov-report/index.html`.

Última ejecución verificada, **11 de noviembre de 2026**: **467 pruebas aprobadas en 57 suites**, con **99,71 % de cobertura de líneas**. El [informe de auditoría](docs/unit-test-audit.md) detalla las métricas, el alcance y las limitaciones.

El hook de pre-commit ejecuta `pnpm test:cov`. El script `test:e2e` todavía apunta a una configuración inexistente en `test/jest-e2e.json`.

## Estructura y documentación

- [`src`](src): código fuente, configuración, servicios compartidos y autenticación.
- [`docs/base.md`](docs/base.md): documentación técnica del arranque, variables, endpoints, persistencia, logs y límites actuales.
- [`docs/unit-test-audit.md`](docs/unit-test-audit.md): resultados y alcance de las pruebas unitarias.
- [`Arquitectura de Auth`](src/modules/auth/docs/architecture.md): organización y responsabilidades de las capas.
- [`docker/postgresql-auth/docker-compose.yml`](docker/postgresql-auth/docker-compose.yml): PostgreSQL de desarrollo con almacenamiento persistente.
