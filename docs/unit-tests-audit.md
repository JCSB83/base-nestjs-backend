# Auditoria de pruebas unitarias

Fecha: 2026-10-26.

## Alcance

Se revisaron todos los archivos de `src`, las 14 suites existentes, la configuracion de TypeScript/Jest, el manifiesto y la documentacion. El proyecto contiene arranque y cierre de Nest, AppModule, AppConfigModule, SharedModule, configuracion Joi, controladores de salud y errores HTTP, dos loggers, un interceptor, errores personalizados, ResponseDto y utilidades. No contiene repositorios TypeORM, clientes de base de datos, mensajeria ni casos de uso de negocio. RepositoryError y UseCaseError son clases de error, no repositorios ni casos de uso.

Todos los archivos con comportamiento ya tenian pruebas adyacentes. ResponseDto solo inicializa y asigna propiedades; no tiene decoradores de class-validator/class-transformer que requieran pruebas de validacion o transformacion. No se agregaron pruebas para declaraciones ni tipos.

## Cambios

- `src/app.config.spec.ts`: inyeccion de ConfigService con TestingModule, limites de puerto, puertos invalidos y niveles de logging permitidos (15 casos nuevos).
- `src/modules/shared/shared.module.spec.ts`: compilacion del modulo real con dependencias externas simuladas, seleccion y reutilizacion del logger, resolucion del interceptor/controlador y rechazo de configuracion invalida (3 casos nuevos).
- `src/modules/shared/services/lokiLogger.service.spec.ts`: dos envios concurrentes que terminan fuera de orden, uno fallido y otro exitoso, manteniendo independiente su estado (1 caso nuevo).
- `package.json`: se permite que Jest transforme @nestjs/config y es-toolkit dentro de las rutas anidadas de pnpm. La expresion anterior ignoraba esos paquetes al encontrar el segmento `.pnpm`, causando errores de carga ESM en cinco suites.

Se conservaron todas las pruebas y aserciones previas. No se cambiaron archivos de implementacion, dependencias ni exclusiones de cobertura. Los cambios ajenos existentes en el workspace se conservaron.

## Validacion

En PowerShell se uso `pnpm.cmd`, equivalente al lanzador pnpm, porque la politica local impide ejecutar pnpm.ps1.

- `pnpm.cmd test`: 14 suites aprobadas; 134 pruebas ejecutadas, 134 exitosas, 0 fallidas.
- `pnpm.cmd test:cov`: 14 suites aprobadas; 134 pruebas ejecutadas, 134 exitosas, 0 fallidas.
- `pnpm.cmd exec tsc --project tsconfig.spec.json --noEmit --incremental false`: sin errores.

| Metrica | Cobertura |
| --- | ---: |
| Statements | 99.61% |
| Branches | 98.59% |
| Functions | 100% |
| Lines | 99.57% |

El informe HTML se genera en `coverage/lcov-report/index.html`. La cobertura ya era equivalente una vez corregida la carga ESM; los 19 casos adicionales refuerzan contratos que los porcentajes por si solos no verifican.

## Pendientes y hallazgos

- La unica linea no cubierta es `src/modules/shared/services/log4jsLogger.service.ts:20`: retorno de una guardia privada redundante. El constructor ya evita llamar a configure cuando el servicio esta configurado. No se invocaron metodos privados ni se altero el estado interno artificialmente para alcanzar esa rama. No quedan archivos ejecutables sin pruebas.
- `CommonController.getHttpException` ignora el parametro message para errores inesperados y devuelve siempre `login failed`. Puede comunicar un fallo de autenticacion en operaciones ajenas al login. La prueba existente documenta ese comportamiento; requiere decidir el mensaje correcto antes de corregirlo.
- Log4js usa APP_NAME para el archivo y no utiliza LOG_NAME; Loki no aplica LOG_LEVEL. Son discrepancias entre las opciones expuestas y el comportamiento que requieren confirmar la intencion, especialmente si se espera filtrar logs o configurar el nombre del archivo.
- README y docs/base.md todavia describen yarn, pruebas bajo test/ y resultados antiguos. Esta auditoria describe la estructura y ejecucion actuales.

No se corrigieron automaticamente estos comportamientos de implementacion.
