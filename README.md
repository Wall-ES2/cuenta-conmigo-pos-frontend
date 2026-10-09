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

Desde Administración se pueden agregar y editar productos con nombre, categoría, precio, descripción y una foto opcional. La foto se referencia con el campo `imageUrl` del contrato REST de `/products`: debe ser una URL absoluta HTTP o HTTPS accesible por los navegadores de las cajas. El frontend todavía no sube archivos de imagen; para habilitar esa opción hace falta implementar un servicio de almacenamiento y un contrato de carga en el backend.

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

## Sabores e inventario de helados

Los productos del catálogo usan `isFlavor: true` para indicar que son sabores disponibles. Un producto vendible configurable, como **Helado de 2 bochas**, declara:

```json
{
  "salesConfiguration": {
    "type": "flavors",
    "selectionCount": 2,
    "allowDuplicates": true
  }
}
```

La venta exige exactamente selectionCount sabores; por ejemplo, un cucurucho simple configurado con una bocha no permite agregar más. La interfaz filtra sabores no disponibles, muestra tarjetas con stock, conserva distintas combinaciones como líneas distintas y permite editar los sabores desde el carrito. El precio lo define el tipo de cucurucho; los sabores son insumos, no se venden por separado, y cada bocha consume una porción. Los productos normales (por ejemplo, facturas) también controlan stock en unidades. Inventario permite cargar existencias y actualizar el mínimo requerido de cualquier producto con control de stock.

### Contrato REST pendiente del backend

`GET /products` debe incluir `isFlavor`, `tracksInventory`, `unitCost` (costo unitario de compra o producción, opcional), `availablePortions` como entero no negativo de la sucursal activa y `minimumPortions` como entero no negativo para cada producto inventariable. En sabores, `unitCost` representa el costo por bocha; en cucuruchos configurables, el costo base no incluye los sabores seleccionados. Si no existe conteo inicial, omitir `availablePortions`; el frontend lo muestra como **Sin conteo inicial**, no como stock ilimitado confirmado. `POST /products` y `PUT /products/:id` reciben y devuelven `isFlavor`, `tracksInventory`, `salesConfiguration`, `unitCost` y `minimumPortions`; `availablePortions` se administra únicamente mediante movimientos.

`POST /sales` recibe en cada línea `sabores: [{ "productoId": "...", "nombre": "..." }]` y `costoUnitario` como snapshot local opcional para reportes. Para un cucurucho, el backend valida exactamente selectionCount sabores; solo el precio del cucurucho determina el total y los sabores seleccionados descuentan stock. Los productos normales descuentan una unidad por artículo vendido. El backend debe volver a leer precios, costos y configuraciones, calcular el consumo, validar y descontar existencias dentro de la misma transacción que guarda la venta. No debe confiar en los nombres, precios, costos, saldos ni totales enviados por el navegador.

Los reportes muestran la facturación histórica local, permiten elegir períodos o un día específico y ofrecen tendencia diaria interactiva. La ganancia bruta y el margen se calculan cuando cada artículo vendido tiene un costo guardado; si falta alguno, el reporte indica que faltan costos. No se presenta ganancia neta porque aún no se registran gastos operativos ni comisiones.

Las rutas para el inventario son:

- `GET /inventory/products/:productId/movements?limit=25`: devuelve los movimientos recientes con `id`, `type` (incluye `sale` para descuentos generados por ventas), `quantityDelta`, `balanceAfter`, `reason`, `createdAt` y `userName`.
- `POST /inventory/products/:productId/movements`: recibe `{ "type": "opening|receipt|return|waste|adjustment", "quantityDelta": 4, "reason": "Conteo inicial" }` y exige `Idempotency-Key`. Las porciones son enteros; ingresos, devoluciones y carga inicial suman; mermas restan; un ajuste puede sumar o restar. El backend rechaza saldos negativos y una segunda carga inicial.

El saldo se mantiene por sucursal. El backend debe resolver la sucursal a partir de la sesión autenticada del usuario o terminal y autorizar cualquier acceso de Gerencia a otra sucursal; no debe aceptar una sucursal arbitraria sin comprobar permisos.

La cola offline descuenta localmente las porciones al guardar la venta. Si `POST /sales` responde `409` con `{ "code": "INSUFFICIENT_FLAVOR_STOCK", "message": "..." }`, el cliente conserva la venta, la marca para intervención y evita reintentos automáticos; después de revisar el stock se puede solicitar un reintento manual con la misma clave idempotente de venta. Los errores temporales continúan reintentándose con la cola actual.
