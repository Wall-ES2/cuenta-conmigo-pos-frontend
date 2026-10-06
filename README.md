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

## Despliegue en Vercel

El flujo [vercel-deploy.yml](./.github/workflows/vercel-deploy.yml) ejecuta pruebas, lint y build en pull requests a `main`. Al integrar cambios en `main`, repite las comprobaciones, prepara la salida de producción y despliega a Vercel. Las rutas del cliente, como `/login` y `/financiero`, se reescriben al App Shell mediante [vercel.json](./vercel.json).

### Configuración inicial

1. Importar este repositorio en Vercel y crear el proyecto de producción. El proyecto debe usar el preset **Vite**, instalar con `npm ci` y publicar la carpeta `dist`.
2. Enlazar el repositorio desde una terminal con Vercel CLI (`vercel link`). En el archivo local `.vercel/project.json` se obtienen `orgId` y `projectId`; no subir ese archivo ni el token al repositorio.
3. En GitHub, abrir **Settings → Secrets and variables → Actions** y crear estos *repository secrets*:
   - `VERCEL_TOKEN`: token de despliegue creado en Vercel.
   - `VERCEL_ORG_ID`: valor `orgId` del proyecto enlazado.
   - `VERCEL_PROJECT_ID`: valor `projectId` del proyecto enlazado.
4. En **Settings → Variables → Actions** de GitHub, configurar `VITE_API_BASE_URL` cuando exista un backend. Esta URL no es secreta; puede dejarse sin definir mientras se prepara el backend. También debe configurarse en las variables de entorno de producción de Vercel para que su compilación de producción reciba el mismo valor.
5. En la protección de la rama `main`, exigir que pase el workflow **Validar y desplegar en Vercel** antes de permitir la integración.
6. Abrir un pull request contra `main` para comprobar las validaciones. Al integrar, el flujo despliega producción automáticamente.

El pipeline no crea usuarios ni infraestructura del backend. La primera cuenta Administrador debe provisionarse de forma segura en el backend; después, un Administrador puede crear las demás cuentas desde la aplicación.

## Alcance offline y reportes

Las ventas se guardan localmente y permanecen en la cola hasta sincronizarse con el backend. Los tableros Inicio y Financiero actualmente resumen el historial local del dispositivo; no representan datos consolidados de varias cajas o sucursales.
