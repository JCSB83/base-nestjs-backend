# Resultado de pruebas unitarias

Fecha: 17 de noviembre de 2026.

## Resultado

- 19 suites ejecutadas y aprobadas.
- 115 pruebas ejecutadas: 115 exitosas, 0 fallidas.
- Sentencias: 99,73 %.
- Ramas: 97,11 %.
- Funciones: 100 %.
- Líneas: 99,70 %.
- Umbrales globales existentes: 80 %, sin cambios.

Validaciones exitosas: `pnpm test`, `pnpm test:cov`,
`pnpm exec tsc --project tsconfig.spec.json --noEmit --incremental false`
y `pnpm exec eslint "src/**/*.spec.ts"`.
En PowerShell se utilizó `pnpm.cmd` para evitar la restricción local de ejecución de scripts.

## Archivos de pruebas creados

Todos se encuentran junto al archivo que prueban:

1. `src/app.config.spec.ts`
2. `src/app.config.module.spec.ts`
3. `src/app.module.spec.ts`
4. `src/main.spec.ts`
5. `src/health/health.controller.spec.ts`
6. `src/health/health.module.spec.ts`
7. `src/metrics/metrics.controller.spec.ts`
8. `src/metrics/metrics.middleware.spec.ts`
9. `src/metrics/metrics.module.spec.ts`
10. `src/metrics/metrics.service.spec.ts`
11. `src/shared/controllers/common.controller.spec.ts`
12. `src/shared/dto/response.dto.spec.ts`
13. `src/shared/errors/repository.error.spec.ts`
14. `src/shared/errors/usecase.error.spec.ts`
15. `src/shared/interceptors/log-request.interceptor.spec.ts`
16. `src/shared/services/log4jsLogger.service.spec.ts`
17. `src/shared/services/lokiLogger.service.spec.ts`
18. `src/shared/shared.module.spec.ts`
19. `src/shared/utils/utils.spec.ts`

Pruebas existentes modificadas o eliminadas: ninguna; no se encontraron archivos de pruebas existentes.
No se modificaron archivos de producción ni se añadieron dependencias.
En `package.json` se añadió únicamente la exclusión de `src/**/*.enum.ts` a la cobertura:
el enum existente declara constantes y no contiene reglas de negocio.
Se conservaron los módulos en el cálculo porque contienen comportamiento ejecutable.
Se probó `ResponseDto` porque su constructor inicializa valores y copia propiedades.

## Alcance

Se verifican delegación y errores en controladores; creación, reutilización y conflictos de etiquetas
en métricas; duración y registro único de solicitudes terminadas o abortadas; niveles de logging,
serialización y fallos HTTP; transformación de excepciones; validación de configuración; selección
del proveedor de logging; arranque, cierre y errores del ciclo de vida.

Las dependencias externas están simuladas. No se levantan servidores, no se realizan peticiones HTTP,
no se escriben archivos de log mediante log4js ni se conectan bases de datos.
Los relojes y la aleatoriedad se controlan donde afectan las aserciones.
Las señales y la terminación del proceso se interceptan; no se envían señales reales.

## Cobertura pendiente

No quedan clases ni métodos completos sin cobertura. Quedan estas ramas defensivas:

- `MetricsService`, líneas 29 y 68: alternativas `?? []` de los mapas de etiquetas.
  La API pública crea conjuntamente la métrica y su entrada de etiquetas; alcanzar esas alternativas
  requeriría alterar los mapas privados.
- `Log4jsLoggerService.configure`, línea 20: retorno si ya está configurado.
  El constructor evita llamar al método en ese estado. La reutilización entre instancias sí está probada.

No se añadieron pruebas que alteren estado privado exclusivamente para alcanzar el 100 %.
El informe HTML se genera en `coverage/lcov-report/index.html`.

## Problemas y recomendaciones

- `CommonController.getHttpException` responde con el mensaje fijo `login failed` ante errores
  inesperados e ignora el parámetro `message`. La prueba documenta el comportamiento actual.
  Conviene revisar si debe conservar el mensaje de la operación; no se corrigió producción.
- Jest/CommonJS no pudo cargar directamente algunos archivos ESM de Swagger y Terminus.
  Se simularon sus decoradores y dependencias en las pruebas unitarias correspondientes.
  Estas pruebas no validan la integración real de Swagger o Terminus.
- Para facilitar futuras pruebas, convendría poder inyectar el cliente HTTP, el registro de métricas
  y el logger de log4js, así como separar el arranque de su ejecución automática.
  Esto reduciría los mocks de módulos y el aislamiento necesario para el estado estático.
- Mantener pruebas de integración separadas para el documento OpenAPI, los indicadores reales
  y la configuración completa de NestJS complementaría esta suite unitaria.
