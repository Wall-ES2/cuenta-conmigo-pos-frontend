import { ventasDatabase } from "../data/ventasDatabase.js";
import { apiRequest } from "../../../services/apiClient.js";

let sincronizacionActiva;

export function obtenerEndpointSincronizacion() {
  const baseUrl = import.meta.env?.VITE_API_BASE_URL?.trim();
  const ruta = import.meta.env?.VITE_SALES_SYNC_PATH?.trim() || "/sales";

  if (!baseUrl) return "";

  return `${baseUrl.replace(/\/+$/, "")}/${ruta.replace(/^\/+/, "")}`;
}

export function obtenerRutaSincronizacion() {
  const ruta = import.meta.env?.VITE_SALES_SYNC_PATH?.trim() || "/sales";
  return `/${ruta.replace(/^\/+/, "")}`;
}

export async function sincronizarVentasPendientes({
  apiRequestImpl = apiRequest,
  endpoint = obtenerRutaSincronizacion(),
} = {}) {
  if (!endpoint) {
    return { estado: "esperando-configuracion", sincronizadas: 0 };
  }

  if (sincronizacionActiva) return sincronizacionActiva;

  sincronizacionActiva = procesarCola(apiRequestImpl, endpoint);

  try {
    return await sincronizacionActiva;
  } finally {
    sincronizacionActiva = undefined;
  }
}

async function procesarCola(apiRequestImpl, endpoint) {
  const pendientes = await ventasDatabase.colaSincronizacion
    .orderBy("creadaEn")
    .toArray();
  let sincronizadas = 0;

  for (const pendiente of pendientes) {
    const venta = await reclamarVenta(pendiente.id);
    if (!venta) continue;

    try {
      await apiRequestImpl(endpoint, {
        method: "POST",
        headers: { "Idempotency-Key": venta.id },
        body: venta,
      });

      await ventasDatabase.transaction(
        "rw",
        ventasDatabase.ventas,
        ventasDatabase.colaSincronizacion,
        async () => {
          await ventasDatabase.ventas.update(venta.id, {
            estado: "sincronizada",
            sincronizadaEn: new Date().toISOString(),
          });
          await ventasDatabase.colaSincronizacion.delete(venta.id);
        },
      );

      sincronizadas += 1;
    } catch (error) {
      await liberarVentaConError(venta.id, error);

      const requiereIntervencion = esConflictoStock(error);

      return {
        estado: requiereIntervencion ? "requiere-intervencion" : "error",
        sincronizadas,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido al sincronizar.",
      };
    }
  }

  const quedanPendientes = await ventasDatabase.colaSincronizacion.count();
  const bloqueadas = await ventasDatabase.colaSincronizacion
    .filter((item) => item.bloqueada === true)
    .toArray();
  return {
    estado:
      bloqueadas.length > 0
        ? "requiere-intervencion"
        : quedanPendientes === 0
          ? "sincronizada"
          : "pendiente",
    sincronizadas,
    error: bloqueadas[0]?.ultimoError,
  };
}

function esConflictoStock(error) {
  return (
    error?.status === 409 &&
    error?.details?.code === "INSUFFICIENT_FLAVOR_STOCK"
  );
}

async function reclamarVenta(id) {
  return ventasDatabase.transaction(
    "rw",
    ventasDatabase.ventas,
    ventasDatabase.colaSincronizacion,
    async () => {
      const cola = await ventasDatabase.colaSincronizacion.get(id);

      if (
        !cola ||
        cola.bloqueada ||
        (cola.reclamoHasta && cola.reclamoHasta > Date.now())
      ) {
        return undefined;
      }

      const venta = await ventasDatabase.ventas.get(id);
      if (!venta) {
        await ventasDatabase.colaSincronizacion.delete(id);
        return undefined;
      }

      await ventasDatabase.colaSincronizacion.update(id, {
        reclamoHasta: Date.now() + 60_000,
      });

      return venta;
    },
  );
}

async function liberarVentaConError(id, error) {
  const conflictoStock = esConflictoStock(error);
  await ventasDatabase.colaSincronizacion.update(id, (cola) => {
    if (!conflictoStock) cola.intentos = (cola.intentos ?? 0) + 1;
    cola.ultimoError =
      error instanceof Error
        ? error.message
        : "Error desconocido al sincronizar.";
    cola.bloqueada = conflictoStock;
    cola.codigoError = conflictoStock ? error.details.code : undefined;
    cola.reclamoHasta = 0;
    return true;
  });
}
