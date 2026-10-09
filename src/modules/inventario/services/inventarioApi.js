import { apiRequest } from "../../../services/apiClient.js";

const tiposMovimientoManual = new Set([
  "opening",
  "receipt",
  "return",
  "waste",
  "adjustment",
]);
const tiposMovimientoApi = new Set([...tiposMovimientoManual, "sale"]);

export async function listarMovimientosInventarioApi(productId) {
  const id = validarIdProducto(productId);
  const response = await apiRequest(
    `/inventory/products/${encodeURIComponent(id)}/movements?limit=25`,
  );

  if (!Array.isArray(response)) {
    throw new Error(
      "El backend debe devolver una lista de movimientos de inventario.",
    );
  }

  return response.map(normalizarMovimientoApi);
}

export async function registrarMovimientoInventarioApi(
  productId,
  movimiento,
  idempotencyKey,
) {
  const id = validarIdProducto(productId);
  const payload = normalizarMovimientoEntrada(movimiento);

  if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    throw new Error("La clave de idempotencia del movimiento es obligatoria.");
  }

  return normalizarMovimientoApi(
    await apiRequest(
      `/inventory/products/${encodeURIComponent(id)}/movements`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: payload,
      },
    ),
  );
}

export function normalizarMovimientoEntrada(movimiento) {
  const { type, quantityDelta, reason } = movimiento ?? {};
  const motivo = typeof reason === "string" ? reason.trim() : "";

  if (!tiposMovimientoManual.has(type)) {
    throw new Error("Selecciona un tipo de movimiento de inventario válido.");
  }
  if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
    throw new Error(
      "La cantidad del movimiento debe ser un entero distinto de cero.",
    );
  }
  if (["opening", "receipt", "return"].includes(type) && quantityDelta < 1) {
    throw new Error("Este tipo de movimiento debe sumar porciones al stock.");
  }
  if (type === "waste" && quantityDelta > -1) {
    throw new Error("La merma debe restar porciones del stock.");
  }
  if (motivo.length < 3) {
    throw new Error(
      "Indica un motivo de al menos 3 caracteres para el movimiento.",
    );
  }
  if (motivo.length > 240) {
    throw new Error("El motivo no puede superar los 240 caracteres.");
  }

  return { type, quantityDelta, reason: motivo };
}

export function normalizarMovimientoApi(movimiento) {
  if (
    !movimiento ||
    typeof movimiento.id !== "string" ||
    !tiposMovimientoApi.has(movimiento.type) ||
    !Number.isInteger(movimiento.quantityDelta) ||
    movimiento.quantityDelta === 0 ||
    !Number.isInteger(movimiento.balanceAfter) ||
    movimiento.balanceAfter < 0 ||
    typeof movimiento.createdAt !== "string" ||
    Number.isNaN(Date.parse(movimiento.createdAt)) ||
    typeof movimiento.reason !== "string" ||
    movimiento.reason.length > 240 ||
    (movimiento.userName !== undefined &&
      typeof movimiento.userName !== "string")
  ) {
    throw new Error(
      "El backend devolvió un movimiento de inventario inválido.",
    );
  }

  if (
    (["opening", "receipt", "return"].includes(movimiento.type) &&
      movimiento.quantityDelta < 1) ||
    (["sale", "waste"].includes(movimiento.type) &&
      movimiento.quantityDelta > -1)
  ) {
    throw new Error(
      "El backend devolvió un movimiento de inventario con signo inválido.",
    );
  }

  return {
    id: movimiento.id,
    tipo: movimiento.type,
    cantidad: movimiento.quantityDelta,
    saldoPosterior: movimiento.balanceAfter,
    motivo: movimiento.reason,
    creadoEn: movimiento.createdAt,
    usuario: movimiento.userName ?? "",
  };
}

function validarIdProducto(productId) {
  if (typeof productId !== "string" || !productId.trim()) {
    throw new Error("El producto seleccionado no es válido.");
  }
  return productId.trim();
}
