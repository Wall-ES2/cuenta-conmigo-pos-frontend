# Cuenta Conmigo POS

Frontend del sistema de punto de venta Cuenta Conmigo. Es una aplicación React y Vite con interfaz en español, catálogo sin productos precargados y persistencia local de ventas para operación offline-first.

## Desarrollo local

Requisitos: Node.js 22 y npm.

```sh
npm ci
npm run dev
```

Comprobaciones antes de integrar cambios:

```sh
npm test
npm run lint
npm run build
```

La aplicación consume el backend REST usando `VITE_API_BASE_URL`. Para desarrollo, crear `.env.local` a partir de `.env.example` y establecer la URL base del backend. No guardar contraseñas, tokens ni otras credenciales en variables `VITE_*`: Vite las incluye en los archivos públicos del navegador.

Los productos pueden incluir el campo opcional `imageUrl` en el contrato REST de `/products`. Debe ser una URL absoluta HTTP o HTTPS; para el catálogo publicado se recomienda HTTPS y un recurso accesible por los navegadores de las cajas. El frontend no sube ni almacena archivos de imagen.

## Publicación en GitHub Pages

El workflow [github-pages.yml](./.github/workflows/github-pages.yml) ejecuta pruebas, lint y build en cada pull request a `main`. Al integrar cambios en `main`, publica automáticamente `dist` en GitHub Pages.

La aplicación usa la ruta base `/cuenta-conmigo-pos-frontend/`, necesaria para GitHub Pages en un repositorio de proyecto. El workflow también publica un `404.html` basado en `index.html` para permitir que React Router atienda rutas internas.

La vista previa demostrativa está disponible públicamente en `/cuenta-conmigo-pos-frontend/preview`. Usa datos ficticios y sus operaciones solo viven en memoria; no crea cuentas reales ni modifica el backend.

### Configuración inicial

1. En GitHub, abrir **Settings → Pages** y seleccionar **GitHub Actions** como fuente de publicación.
2. Al integrar cambios en `main`, esperar a que termine el workflow **Validar y publicar en GitHub Pages**. La URL del sitio aparece en la ejecución del paso de despliegue y en **Settings → Pages**.
3. El frontend puede publicarse sin backend, pero el inicio de sesión y las operaciones remotas necesitan `VITE_API_BASE_URL`. Cuando el backend esté disponible, configurarla como variable de Actions y repetir el despliegue. Esta URL no es secreta; no poner contraseñas o tokens en variables `VITE_*`.

El pipeline no crea usuarios ni infraestructura del backend. La primera cuenta Administrador debe provisionarse de forma segura en el backend; después, un Administrador puede crear las demás cuentas desde la aplicación.

## Alcance offline y reportes

Las ventas se guardan localmente y permanecen en la cola hasta sincronizarse con el backend. Los tableros Inicio y Financiero actualmente resumen el historial local del dispositivo; no representan datos consolidados de varias cajas o sucursales.
