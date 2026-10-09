import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizarMovimientoApi,
  normalizarMovimientoEntrada,
} from "./inventarioApi.js";

describe("movimientos de inventario", () => {
  it("normaliza ingresos y valida cantidades enteras positivas", () => {
    assert.deepEqual(
      normalizarMovimientoEntrada({
        type: "receipt",
        quantityDelta: 12,
        reason: "Compra semanal",
      }),
      {
        type: "receipt",
        quantityDelta: 12,
        reason: "Compra semanal",
      },
    );

    assert.throws(
      () =>
        normalizarMovimientoEntrada({
          type: "receipt",
          quantityDelta: 1.5,
          reason: "",
        }),
      /entero/,
    );
  });

  it("requiere cantidades y motivos coherentes con merma y ajustes", () => {
    assert.throws(
      () =>
        normalizarMovimientoEntrada({
          type: "waste",
          quantityDelta: 2,
          reason: "Vencido",
        }),
      /debe restar/,
    );

    assert.throws(
      () =>
        normalizarMovimientoEntrada({
          type: "adjustment",
          quantityDelta: -1,
          reason: "  ",
        }),
      /motivo/,
    );
  });

  it("rechaza saldo negativo e historial con datos inválidos del backend", () => {
    assert.throws(
      () =>
        normalizarMovimientoApi({
          id: "movement-1",
          type: "waste",
          quantityDelta: -2,
          balanceAfter: -1,
          reason: "Derrame",
          createdAt: "2026-10-08T12:00:00.000Z",
        }),
      /movimiento de inventario inválido/,
    );
  });
});
