# Pruebas unitarias

Ejecutar desde la raíz de `base-nestjs-backend`:

```bash
yarn test --runInBand
yarn test:cov --runInBand
yarn test:watch
```

En PowerShell se puede usar `yarn.cmd` si la política de ejecución bloquea `yarn.ps1`.

Las nueve suites cubren configuración, validación Joi, composición de módulos, arranque y cierre, salud, interceptor HTTP, Log4js, Loki y generación de identificadores. Los archivos `.spec.ts` conservan la organización de `src`.

Las pruebas no requieren `.env`, un servidor Loki ni puertos disponibles. Axios y Log4js se simulan; el arranque usa una aplicación simulada, y las señales se capturan sin enviarlas al proceso. Los spies y el código de salida se restauran al finalizar las pruebas. Los constructores de configuración se aíslan de las variables locales.

`setup.ts` sustituye Terminus por providers simulados para comprobar las dependencias de nuestros módulos sin ejecutar los indicadores reales. La prueba de `main.ts` simula Swagger y comprueba los argumentos que recibe. Estas suites no sustituyen pruebas de integración o end-to-end.

Jest se configura en `package.json`. `tsconfig.json` de esta carpeta compila las pruebas a CommonJS y permite transformar la dependencia ESM `@nestjs/config` y `es-toolkit`. No modifica la compilación de producción.

La cobertura incluye `src/**/*.ts` salvo declaraciones `.d.ts`. El informe HTML se genera en `coverage/lcov-report/index.html`. No se fuerza el 100 %: la guardia interna redundante de `Log4jsLoggerService.configure()` no es accesible mediante el flujo público normal cuando la configuración ya se realizó.
