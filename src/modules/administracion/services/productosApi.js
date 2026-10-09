import { apiRequest } from "../../../services/apiClient.js";
import { normalizarConfiguracionVenta } from "../../ventas/domain/configuracionSabores.js";

export async function listarProductosApi() {
  const response = await apiRequest("/products");

  if (!Array.isArray(response)) {
    throw new Error(
      "El backend debe devolver una lista de productos en /products.",
    );
  }

  return response.map(normalizarProductoApi);
}

export async function crearProductoApi(producto) {
  const response = await apiRequest("/products", {
    method: "POST",
    body: serializarProductoApi(producto),
    headers: { "Idempotency-Key": producto.id },
  });

  return normalizarProductoApi(response);
}

export async function actualizarProductoApi(producto) {
  const response = await apiRequest(
    `/products/${encodeURIComponent(producto.id)}`,
    {
      method: "PUT",
      body: serializarProductoApi(producto),
    },
  );

  return normalizarProductoApi(response);
}

export async function eliminarProductoApi(id) {
  await apiRequest(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function normalizarProductoApi(producto) {
  if (
    !producto ||
    typeof producto.id !== "string" ||
    typeof producto.name !== "string" ||
    typeof producto.category !== "string" ||
    !Number.isFinite(producto.price)
  ) {
    throw new Error("El backend devolvió un producto con campos inválidos.");
  }

  if (
    producto.isFlavor !== undefined &&
    typeof producto.isFlavor !== "boolean"
  ) {
    throw new Error(
      "El backend devolvió un producto con configuración de sabor inválida.",
    );
  }

  const esSabor = producto.isFlavor ?? false;
  const controlaStock = producto.tracksInventory ?? (esSabor || !producto.salesConfiguration);
  if (typeof controlaStock !== "boolean") {
    throw new Error("El backend devolvió una configuración de stock inválida.");
  }
  const salesConfiguration = producto.salesConfiguration;
  const configuracionVenta =
    salesConfiguration == null
      ? null
      : normalizarConfiguracionVenta({
          tipo:
            salesConfiguration.type === "flavors"
              ? "sabores"
              : salesConfiguration.type,
          cantidadSabores: salesConfiguration.selectionCount,
          permitirRepetidos: salesConfiguration.allowDuplicates,
        });

  if (esSabor && (producto.category !== "helados" || configuracionVenta)) {
    throw new Error(
      "Un sabor debe pertenecer a Helados y no puede ser configurable.",
    );
  }

  const stockDisponible = producto.availablePortions;
  const stockMinimo = producto.minimumPortions;
  if (
    stockDisponible !== undefined &&
    stockDisponible !== null &&
    (!Number.isInteger(stockDisponible) || stockDisponible < 0)
  ) {
    throw new Error(
      "El backend devolvió una disponibilidad de sabor inválida.",
    );
  }
  if (
    stockMinimo !== undefined &&
    stockMinimo !== null &&
    (!Number.isInteger(stockMinimo) || stockMinimo < 0)
  ) {
    throw new Error("El backend devolvió un mínimo de stock inválido.");
  }

  const imagenUrl = normalizarImagenUrl(producto.imageUrl);

  const productoNormalizado = {
    id: producto.id,
    nombre: producto.name,
    categoria: producto.category,
    precio: producto.price,
    controlaStock,
    detalle: typeof producto.detail === "string" ? producto.detail : "",
    imagenUrl,
  };

  if (producto.isFlavor !== undefined || salesConfiguration !== undefined || producto.tracksInventory !== undefined) {
    productoNormalizado.esSabor = esSabor;
    productoNormalizado.configuracionVenta = configuracionVenta;
  }
  if (stockDisponible !== undefined && stockDisponible !== null) {
    productoNormalizado.stockDisponible = stockDisponible;
  }
  if (stockMinimo !== undefined && stockMinimo !== null) {
    productoNormalizado.stockMinimo = stockMinimo;
  }

  return productoNormalizado;
}

export function normalizarImagenUrl(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") {
    throw new Error("La URL de imagen debe ser un enlace HTTP o HTTPS.");
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Protocolo inválido.");
    return url.href;
  } catch (error) {
    throw new Error("La URL de imagen debe ser un enlace HTTP o HTTPS.", {
      cause: error,
    });
  }
}

export function serializarProductoApi(producto) {
  const configuracionVenta = normalizarConfiguracionVenta(
    producto.configuracionVenta,
  );
  if (producto.esSabor && (producto.categoria !== "helados" || configuracionVenta)) {
    throw new Error(
      "Un sabor debe pertenecer a Helados y no puede ser configurable.",
    );
  }
  if (
    (producto.controlaStock ?? (producto.esSabor || !configuracionVenta)) &&
    (!Number.isInteger(producto.stockMinimo ?? 0) ||
      (producto.stockMinimo ?? 0) < 0)
  ) {
    throw new Error(
      "El mínimo de stock debe ser un entero igual o mayor que cero.",
    );
  }

  return {
    id: producto.id,
    name: producto.nombre,
    category: producto.categoria,
    price: producto.precio,
    detail: producto.detalle,
    imageUrl: normalizarImagenUrl(producto.imagenUrl) || null,
    isFlavor: producto.esSabor === true,
    tracksInventory: producto.controlaStock ?? (producto.esSabor === true || !configuracionVenta),
    salesConfiguration: configuracionVenta
      ? {
          type: "flavors",
          selectionCount: configuracionVenta.cantidadSabores,
          allowDuplicates: configuracionVenta.permitirRepetidos,
        }
      : null,
    minimumPortions: (producto.controlaStock ?? (producto.esSabor === true || !configuracionVenta)) ? (producto.stockMinimo ?? 0) : null,
  };
}
