# Auditoría de pruebas unitarias

Fecha de verificación: **11 de noviembre de 2026**.

La última ejecución termina correctamente: **467 pruebas aprobadas en 57 suites**, sin snapshots. Las cuatro métricas globales de cobertura superan el umbral configurado del 80 %. Estos resultados corresponden al árbol de trabajo revisado tras corregir las pruebas de autenticación y no garantizan el comportamiento de integraciones externas ni de cambios posteriores.

## Reproducción

Desde la raíz del proyecto, con las dependencias instaladas mediante `pnpm install`:

```bash
pnpm test --runInBand
pnpm test:cov --runInBand
```

Para esta auditoría se ejecutó `pnpm.cmd test:cov --runInBand` en PowerShell, con código de salida 0. Puedes usar `pnpm.cmd` cuando la política de ejecución impida usar `pnpm.ps1`. Los informes se generan en `coverage/`; el informe navegable está en `coverage/lcov-report/index.html`.

## Configuración comprobada

- [package.json](../package.json) configura Jest con entorno `node`, raíz del repositorio y descubrimiento mediante `(src|test)/.*\.spec\.ts$`.
- Las 57 suites actuales están junto al código en `src/**/*.spec.ts`: 14 de configuración, arranque y servicios compartidos, y 43 de autenticación. No existe actualmente el directorio `test/`.
- Los imports `src/*` se resuelven mediante `moduleNameMapper`. TypeScript se transforma con `ts-jest` y [tsconfig.spec.json](../tsconfig.spec.json), que utiliza CommonJS y tipos de Node y Jest.
- `transformIgnorePatterns` contempla la estructura de `node_modules/.pnpm/`, además de `@nestjs/config`, `@nestjs/jwt` y `es-toolkit`. La transformación de `@nestjs/jwt` permite cargar sus exports ESM en las pruebas CommonJS.
- La cobertura considera `src/**/*.ts` y excluye declaraciones `*.d.ts`. El umbral del 80 % es global para sentencias, ramas, funciones y líneas; no es un mínimo por archivo.
- [tsconfig.build.json](../tsconfig.build.json) excluye las pruebas de la compilación de producción.
- [.husky/pre-commit](../.husky/pre-commit) ejecuta `pnpm test:cov`. El hook de mensajes de commit ejecuta `pnpm exec commitlint --edit "$1"`; esta última comprobación valida mensajes, no pruebas.

## Cobertura observada

| Métrica    | Resultado | Umbral global |
| ---------- | --------- | ------------- |
| Sentencias | 99,73 %   | 80 %          |
| Ramas      | 97,74 %   | 80 %          |
| Funciones  | 99,45 %   | 80 %          |
| Líneas     | 99,71 %   | 80 %          |

Cuatro archivos presentan cobertura parcial en al menos una métrica:

| Archivo                                               | Sentencias | Ramas | Funciones | Líneas  | Línea sin cubrir |
| ----------------------------------------------------- | ---------- | ----- | --------- | ------- | ---------------- |
| `src/modules/shared/shared.module.ts`                 | 93,75 %    | 100 % | 50 %      | 92,85 % | 42               |
| `src/modules/shared/services/log4jsLogger.service.ts` | 95 %       | 75 %  | 100 %     | 94,73 % | 20               |
| `src/modules/auth/presentation/controllers/me.controller.ts` | 94,44 % | 100 % | 100 % | 93,75 % | 87 |
| `src/modules/auth/infrastructure/persistence/typeorm/repositories/session.repository.ts` | 100 % | 81,25 % | 100 % | 100 % | Ramas en 155, 166 y 186; todas las líneas ejecutadas |

El resto de los archivos de producción incluidos en el informe alcanza el 100 % en las cuatro métricas. La cobertura mide ejecución de código: no demuestra por sí sola que cada aserción sea suficiente ni que todos los escenarios estén contemplados.

## Inventario y comportamientos comprobados

Las rutas de esta tabla son relativas a `src/`.

| Suite                                                  | Alcance comprobado                                                                                                                                                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.config.spec.ts`                                   | Inyección de `ConfigService`, getters y propagación de errores; valores predeterminados, conversión y límites del puerto, entornos, niveles de log y validación de URL de Loki.                                                                         |
| `app.config.module.spec.ts`                            | Registro global, exportación de configuración, conversión y validación de variables, conservación de variables ajenas, errores e inicialización.                                                                                                        |
| `app.module.spec.ts`                                   | Composición de módulos mediante metadatos y mensaje de inicialización.                                                                                                                                                                                  |
| `main.spec.ts`                                         | Configuración de Swagger, logger, interceptor y `ValidationPipe`; escucha del puerto, errores de arranque, cierre ante señales repetidas y fallo de cierre.                                                                                             |
| `modules/shared/shared.module.spec.ts`                 | Selección exclusiva del logger, reutilización mediante el contenedor Nest, rechazo de modos inválidos y registro de dependencias y exportaciones.                                                                                                       |
| `modules/shared/controllers/health.controller.spec.ts` | Liveness sin dependencias, readiness según el logger, consulta de Loki con timeout de 3000 ms, desactivación de `logData` y propagación de fallos.                                                                                                      |
| `modules/shared/controllers/common.controller.spec.ts` | Conversión de errores de caso de uso a respuestas HTTP 400/500, conservación de mensajes vacíos y ocultación de detalles de errores inesperados.                                                                                                        |
| `modules/shared/interceptors/log.interceptor.spec.ts`  | Correlación, ruta alternativa, formato de respuestas, severidad por estado, duración, `logData=false`, excepciones HTTP, errores inesperados y cancelación de suscripciones.                                                                            |
| `modules/shared/services/log4jsLogger.service.spec.ts` | Configuración compartida, rotación y formato, delegación de niveles, fallo de configuración con reintento y errores del logger subyacente.                                                                                                              |
| `modules/shared/services/lokiLogger.service.spec.ts`   | Filtrado por los nueve valores de LOG_LEVEL, descarte sin serialización con OFF, cliente HTTP, payload, consola, serialización de errores, fallos de envío e inicialización, envíos concurrentes y rechazo de objetos circulares en mensajes admitidos. |
| `modules/shared/dto/response.dto.spec.ts`              | Valores predeterminados y construcción de respuestas parciales.                                                                                                                                                                                         |
| `modules/shared/errors/repository.error.spec.ts`       | Mensaje, causa, prototipo y trazabilidad, incluidos argumentos opcionales.                                                                                                                                                                              |
| `modules/shared/errors/usecase.error.spec.ts`          | Mensaje, causa, prototipo, trazabilidad y nivel de error.                                                                                                                                                                                               |
| `modules/shared/utils/utils.spec.ts`                   | IDs de ocho dígitos con aleatoriedad controlada y combinación de esquemas Joi, incluidos esquemas vacíos y conflictos de tipos.                                                                                                                         |

### Autenticación

Las siguientes rutas son relativas a `src/modules/auth/`; agrupan las 43 suites adicionales.

| Grupo | Suites | Alcance comprobado |
| ----- | ------ | ------------------ |
| `auth.config`, `auth.config.module`, `auth.module` | 3 | Getters, esquema requerido, registro de configuración, conexión PostgreSQL, JWT, entidades y providers. |
| `application/use-cases/` | 11 | Login, renovación y validación de tokens, consulta de usuario y sesiones, logout, revocación y limpieza de expirados; resultados y errores de dependencias simuladas. |
| `application/dto/user.dto.spec.ts` | 1 | Construcción del DTO de usuario. |
| `infrastructure/decorators/`, `guards/`, `strategies/` | 4 | Metadatos de permisos, guards de JWT y permisos, y estrategia JWT. |
| `infrastructure/utils/utils.spec.ts` | 1 | Utilidades de autenticación. |
| `infrastructure/persistence/typeorm/entities/` | 3 | Entidades de usuario, perfil y relación perfil-opción. |
| `infrastructure/persistence/typeorm/repositories/` | 5 | Repositorios base, opciones, usuarios, sesiones y refresh tokens, con dependencias de persistencia simuladas. |
| `infrastructure/persistence/typeorm/migrations/` | 7 | Creación y reversión de tablas, y carga de datos iniciales mediante un `QueryRunner` simulado. |
| `jobs/` | 2 | Invocación de casos de uso de limpieza desde tareas programadas. |
| `presentation/controllers/` | 5 | Controladores de login, logout, usuario actual, refresh y sesiones. |
| `presentation/dto/` | 2 | DTO de login y refresh token. |

## Correcciones verificadas de autenticación

La ejecución inicial presentó **9 suites fallidas y 48 aprobadas**. Se corrigieron los siguientes desajustes sin modificar la lógica de producción:

- `auth.module.spec.ts`: rutas de migraciones y entidades actualizadas a `infrastructure/persistence/typeorm/`.
- `auth.config.spec.ts`: retirada de la expectativa sobre `databaseConnectionName`, getter que ya no existe; el nombre de conexión se comprueba en las pruebas del módulo mediante `AUTH_CONNECTION_NAME`.
- `app.config.module.spec.ts`: datos válidos de autenticación para el esquema combinado, comprobación de conversiones y tres casos de variables obligatorias ausentes.
- `app.module.spec.ts`: inclusión de `AuthModule` en la composición esperada y sustitución del módulo por un mock para mantener el aislamiento.
- Pruebas del repositorio de usuarios y de la migración de datos: import de `Utils` desde las utilidades de autenticación, donde existe `createHash`.
- Pruebas de login, refresh y validación de tokens: eliminación del mock que importaba directamente `jsonwebtoken`, dependencia transitiva no declarada por la app. Se utilizan los exports reales de `@nestjs/jwt`, con transformación habilitada en Jest; los métodos del servicio continúan simulados.

La ejecución posterior de `pnpm.cmd test:cov --runInBand` terminó con código de salida 0: **57 suites y 467 pruebas aprobadas**, sin rebajar los umbrales de cobertura.

## Cobertura de las pruebas de Loki

La configuración simulada incluye `logLevel: LogLevel.ALL`, de modo que las pruebas de envío ejercitan todos los métodos. Se conservan los **14 casos** de la auditoría anterior: nueve para los umbrales de `LOG_LEVEL` y cinco para comprobar `OFF` en cada método público de logging. `LokiLoggerService` conserva el **100 % de cobertura** en sentencias, ramas, funciones y líneas.

| Umbral probado | Métodos que deben emitir                   |
| -------------- | ------------------------------------------ |
| `ALL`, `TRACE` | `verbose`, `debug`, `log`, `warn`, `error` |
| `DEBUG`        | `debug`, `log`, `warn`, `error`            |
| `INFO`         | `log`, `warn`, `error`                     |
| `MARK`, `WARN` | `warn`, `error`                            |
| `ERROR`        | `error`                                    |
| `FATAL`, `OFF` | Ninguno de los cinco métodos implementados |

Los casos de umbral verifican el número y contenido de los POST, además de las emisiones en consola. `FATAL` no admite mensajes de los métodos actuales porque la clase no implementa un método `fatal()`.

Los cinco casos con `OFF` utilizan un objeto circular: comprueban que cada método lo descarta sin lanzar errores, enviar HTTP ni escribir en consola. El caso existente con logging habilitado sigue comprobando que ese objeto provoca un `TypeError` antes del envío. Se conservan las pruebas de errores de transporte y de independencia entre envíos concurrentes.

## Aislamiento y límites

Las suites combinan pruebas unitarias directas con comprobaciones puntuales de inyección en `TestingModule`. No equivalen a iniciar la aplicación completa:

- `main.spec.ts` sustituye `NestFactory`, la aplicación y Swagger; simula señales y `process.exit`. Comprueba llamadas y opciones, pero no abre un puerto ni verifica respuestas HTTP reales.
- Las pruebas de salud sustituyen Terminus y Swagger. Comprueban el uso de indicadores, sin consultar un servidor Loki real.
- Las pruebas de Loki sustituyen Axios y controlan el reloj. Verifican el contenido enviado y las reacciones a promesas resueltas o rechazadas; no verifican disponibilidad, autenticación ni aceptación del payload por un servidor.
- Las pruebas de Log4js sustituyen la biblioteca. Verifican la configuración solicitada, pero no crean archivos ni comprueban la rotación real.
- Las pruebas del interceptor utilizan contextos HTTP simulados y observables. No recorren el pipeline HTTP completo de Nest.
- La configuración de `ValidationPipe` está comprobada, pero no hay una prueba HTTP con un DTO real que demuestre transformación y rechazo de propiedades adicionales.
- Las pruebas de autenticación simulan repositorios, transacciones, `QueryRunner` y métodos de JWT. No verifican una conexión PostgreSQL real, la aplicación efectiva de migraciones, rollback real ni un flujo HTTP completo con tokens firmados y verificados.

No se ejecutaron compilación de producción, lint global ni pruebas e2e como parte de esta verificación. La comprobación aislada de ESLint sobre las pruebas de Loki correspondía a la auditoría anterior y no se repitió para esta actualización. Las declaraciones de tipos excluidas de cobertura tampoco quedan validadas por los porcentajes del informe.

## Hallazgos y acciones recomendadas

| Prioridad | Evidencia                                                                                                                                                   | Acción recomendada                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media     | `test:e2e` apunta a `./test/jest-e2e.json`, pero el archivo y el directorio no existen.                                                                     | Añadir una configuración y pruebas HTTP si se desea ofrecer ese comando, o retirar el script hasta disponer de ellas.                                         |
| Media     | Los transportes y el arranque están simulados.                                                                                                              | Complementar con pruebas de integración para salud, validación HTTP y arranque real; verificar Loki y escritura de logs en un entorno controlado.             |
| Baja      | `SharedModule.onModuleInit()` no se ejecuta en las suites actuales; queda sin cubrir el log de la línea 42.                                                 | Cubrir el ciclo de inicialización si ese mensaje es un requisito observable. Su ausencia no implica un fallo en la selección del logger, que sí está probada. |
| Baja      | El `return` de la línea 20 de `Log4jsLoggerService.configure()` no se ejecuta. El constructor ya evita llamar al método cuando la configuración está hecha. | Evaluar si la guardia redundante debe conservarse. No forzar acceso a un método privado solo para aumentar cobertura.                                         |
| Media | La persistencia y los métodos JWT están simulados. | Añadir integración con PostgreSQL para migraciones, transacciones y sesiones, y un flujo de autenticación con tokens reales. |
| Baja | `MeController` no ejecuta la conversión de errores de la línea 87; la llamada al caso de uso está antes del `try`. | Revisar el alcance del manejo de errores y comprobar el comportamiento público esperado ante fallos. |
| Baja | `SessionRepository` tiene ramas sin cubrir en la selección de repositorio según el `EntityManager` de las líneas 155, 166 y 186. | Evaluar si ambas variantes son alcanzables desde operaciones públicas antes de añadir casos solo para elevar cobertura. |

Las acciones anteriores quedan pendientes; esta auditoría documenta el estado observado y no modifica el código ni las suites.
