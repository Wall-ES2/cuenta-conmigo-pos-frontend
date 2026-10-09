import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ventasDatabase } from "../data/ventasDatabase.js";
import { sincronizarVentasPendientes } from "./sincronizarVentas.js";

const ventaPendiente = {
  id: "venta-sincronizacion-prueba",
  items: [
    {
      productoId: "cafe",
      nombre: "Café",
      precioUnitario: 2000,
      cantidad: 1,
      totalLinea: 2000,
    },
  ],
  total: 2000,
  metodoPago: "Efectivo",
  creadaEn: "2026-10-06T00:00:00.000Z",
  estado: "pendiente",
};

async function prepararVentaPendiente() {
  await ventasDatabase.open();
  await ventasDatabase.transaction(
    "rw",
    ventasDatabase.ventas,
    ventasDatabase.colaSincronizacion,
    async () => {
      await ventasDatabase.ventas.put(ventaPendiente);
      await ventasDatabase.colaSincronizacion.put({
        id: ventaPendiente.id,
        creadaEn: ventaPendiente.creadaEn,
        intentos: 0,
        reclamoHasta: 0,
      });
    },
  );
}

afterEach(async () => {
  await ventasDatabase.open();
  await ventasDatabase.transaction(
    "rw",
    ventasDatabase.productos,
    ventasDatabase.ventas,
    ventasDatabase.colaSincronizacion,
    ventasDatabase.configuracion,
    async () => {
      await Promise.all([
        ventasDatabase.productos.clear(),
        ventasDatabase.ventas.clear(),
        ventasDatabase.colaSincronizacion.clear(),
        ventasDatabase.configuracion.clear(),
      ]);
    },
  );
});

describe("sincronizarVentasPendientes", () => {
  it("envía ventas con clave de idempotencia y las marca sincronizadas", async () => {
    await prepararVentaPendiente();
    let requestOptions;
    const resultado = await sincronizarVentasPendientes({
      endpoint: "https://api.example.test/sales",
      apiRequestImpl: async (url, options) => {
        assert.equal(url, "https://api.example.test/sales");
        requestOptions = options;
      },
    });

    assert.equal(resultado.estado, "sincronizada");
    assert.equal(requestOptions.headers["Idempotency-Key"], ventaPendiente.id);
    assert.equal(requestOptions.body.id, ventaPendiente.id);
    assert.equal(await ventasDatabase.colaSincronizacion.count(), 0);
    assert.equal(
      (await ventasDatabase.ventas.get(ventaPendiente.id)).estado,
      "sincronizada",
    );
  });

  it("conserva la venta en cola e incrementa intentos ante errores HTTP", async () => {
    await prepararVentaPendiente();
    const resultado = await sincronizarVentasPendientes({
      endpoint: "https://api.example.test/sales",
      apiRequestImpl: async () => {
        const error = new Error("La API respondió con estado 503.");
        error.status = 503;
        throw error;
      },
    });

    assert.equal(resultado.estado, "error");
    assert.match(resultado.error, /503/);
    assert.equal(await ventasDatabase.colaSincronizacion.count(), 1);
    assert.equal(
      (await ventasDatabase.colaSincronizacion.get(ventaPendiente.id)).intentos,
      1,
    );
    assert.equal(
      (await ventasDatabase.ventas.get(ventaPendiente.id)).estado,
      "pendiente",
    );
  });

  it("bloquea conflictos definitivos de stock hasta una revisión manual", async () => {
    await prepararVentaPendiente();
    let llamadas = 0;
    const apiRequestImpl = async () => {
      llamadas += 1;
      const error = new Error("No quedan porciones de vainilla.");
      error.status = 409;
      error.details = { code: "INSUFFICIENT_FLAVOR_STOCK" };
      throw error;
    };

    const primerResultado = await sincronizarVentasPendientes({
      endpoint: "https://api.example.test/sales",
      apiRequestImpl,
    });
    const segundoResultado = await sincronizarVentasPendientes({
      endpoint: "https://api.example.test/sales",
      apiRequestImpl,
    });

    assert.equal(primerResultado.estado, "requiere-intervencion");
    assert.equal(segundoResultado.estado, "requiere-intervencion");
    assert.equal(llamadas, 1);
    assert.equal(
      (await ventasDatabase.colaSincronizacion.get(ventaPendiente.id))
        .bloqueada,
      true,
    );
    assert.equal(
      (await ventasDatabase.colaSincronizacion.get(ventaPendiente.id)).intentos,
      0,
    );
  });

  it("conserva ventas pendientes si falta configurar la API", async () => {
    await prepararVentaPendiente();
    const resultado = await sincronizarVentasPendientes({ endpoint: "" });

    assert.equal(resultado.estado, "esperando-configuracion");
    assert.equal(await ventasDatabase.colaSincronizacion.count(), 1);
  });
});
