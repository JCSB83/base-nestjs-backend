# Base NestJS Backend

Base para desarrollar APIs HTTP con **NestJS y TypeScript**. Reúne configuración, validación, logs, monitoreo de salud y pruebas unitarias para servir como punto de partida de nuevos proyectos backend.

## Funciones principales

- **Configuración centralizada:** variables de entorno validadas con Joi y disponibles mediante `AppConfig`.
- **Validación de solicitudes:** `ValidationPipe` global con transformación de datos y rechazo de propiedades no permitidas en DTO validados.
- **Logs configurables:** selección entre Log4js, con consola y archivos rotativos, o Loki, mediante el provider `LOGGER_SERVICE`.
- **Seguimiento HTTP:** interceptor que registra identificador, ruta, estado, duración y cuerpo de respuesta configurable.
- **Comprobaciones de salud:** `/health/live` y `/health/ready`; en modo Loki, disponibilidad del servicio remoto.
- **Documentación de API:** interfaz Swagger en `/swagger`.
- **Ciclo de vida:** manejo de errores de arranque y cierre por señales `SIGINT` y `SIGTERM`.
- **Pruebas y herramientas:** Jest con cobertura, ESLint, Prettier y hooks de Husky para pruebas y validación de mensajes de commit.

## Inicio rápido

Instala las dependencias con `yarn install` y crea un archivo `.env` tomando como referencia [`example.env`](example.env). Deja una sola asignación de `LOG_MODE`: utiliza `log4js` para logs locales o `loki` con una `LOKI_URL` absoluta HTTP(S).

```bash
yarn start:dev
```

El servidor escucha en el puerto definido por `PORT`. Con `PORT=3210`, puedes consultar `http://localhost:3210/health/live` y abrir `http://localhost:3210/swagger`.

## Comandos

| Comando                     | Función                                             |
| --------------------------- | --------------------------------------------------- |
| `yarn start:dev`            | Iniciar en desarrollo con recompilación automática. |
| `yarn build`                | Compilar el código a `dist`.                        |
| `yarn start:prod`           | Ejecutar la compilación existente.                  |
| `yarn test --runInBand`     | Ejecutar las pruebas unitarias.                     |
| `yarn test:cov --runInBand` | Ejecutar pruebas y generar cobertura.               |

En PowerShell, puedes usar `yarn.cmd` si la política de ejecución bloquea `yarn.ps1`.

## Estructura y documentación

- [`src`](src): código fuente, configuración y módulo de servicios compartidos.
- [`test`](test/README.md): pruebas unitarias e instrucciones de ejecución.
- [`docs/base.md`](docs/base.md): documentación técnica del arranque, configuración, endpoints, loggers y pruebas.
