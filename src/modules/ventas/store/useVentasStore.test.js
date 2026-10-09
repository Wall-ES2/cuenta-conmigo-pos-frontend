import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ventasDatabase } from "../data/ventasDatabase.js";
import { useVentasStore } from "./useVentasStore.js";

const productoPrueba = {
  id: "producto-prueba",
  nombre: "Producto de prueba",
  categoria: "helados",
  precio: 1200,
  detalle: "Unidad",
};

async function limpiarEstado() {
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
  useVentasStore.setState({
    productos: [],
    carrito: [],
    inicializado: false,
    cantidadPendiente: 0,
    errorAlmacenamiento: "",
    errorSincronizacion: "",
    guardandoVenta: false,
  });
}

afterEach(limpiarEstado);

describe("useVentasStore", () => {
  it("inicia con catálogo y carrito vacíos", () => {
    const state = useVentasStore.getState();

    assert.deepEqual(state.productos, []);
    assert.deepEqual(state.carrito, []);
  });

  it("valida y persiste productos del catálogo", async () => {
    const { agregarProductoCatalogo } = useVentasStore.getState();

    await assert.rejects(
      () => agregarProductoCatalogo({ ...productoPrueba, precio: 0 }),
      /mayor que cero/,
    );
    await assert.rejects(
      () => agregarProductoCatalogo({ ...productoPrueba, categoria: "todos" }),
      /categoría válida/,
    );

    await agregarProductoCatalogo(productoPrueba);
    assert.equal(useVentasStore.getState().productos[0].id, productoPrueba.id);
    assert.equal(
      (await ventasDatabase.productos.get(productoPrueba.id)).nombre,
      productoPrueba.nombre,
    );
  });

  it("mantiene cantidades y subtotal al modificar el carrito", async () => {
    await useVentasStore.getState().agregarProductoCatalogo(productoPrueba);
    useVentasStore.getState().agregarAlCarrito(productoPrueba.id);
    useVentasStore.getState().agregarAlCarrito(productoPrueba.id);

    let carrito = useVentasStore.getState().carrito;
    assert.equal(carrito.length, 1);
    assert.equal(carrito[0].cantidad, 2);
    assert.equal(carrito[0].precio * carrito[0].cantidad, 2400);

    useVentasStore.getState().disminuirCantidad(productoPrueba.id);
    carrito = useVentasStore.getState().carrito;
    assert.equal(carrito[0].cantidad, 1);

    useVentasStore.getState().disminuirCantidad(productoPrueba.id);
    assert.deepEqual(useVentasStore.getState().carrito, []);
  });

  it("conserva los datos de la línea del carrito si se edita o elimina el catálogo", async () => {
    await useVentasStore.getState().agregarProductoCatalogo(productoPrueba);
    useVentasStore.getState().agregarAlCarrito(productoPrueba.id);
    await useVentasStore
      .getState()
      .actualizarProductoCatalogo(productoPrueba.id, { precio: 1800 });

    assert.equal(useVentasStore.getState().productos[0].precio, 1800);
    assert.equal(useVentasStore.getState().carrito[0].precio, 1200);

    await useVentasStore.getState().eliminarProductoCatalogo(productoPrueba.id);
    assert.deepEqual(useVentasStore.getState().productos, []);
    assert.equal(
      useVentasStore.getState().carrito[0].nombre,
      productoPrueba.nombre,
    );
  });

  it("rechaza agregar al carrito un producto que no está en el catálogo", () => {
    assert.throws(
      () => useVentasStore.getState().agregarAlCarrito(productoPrueba.id),
      /no está en el catálogo/,
    );
  });

  it("mantiene combinaciones de sabores separadas y conserva sus referencias en la venta", async () => {
    const saborVainilla = {
      ...productoPrueba,
      id: "sabor-vainilla",
      nombre: "Vainilla",
      stockDisponible: 3,
      esSabor: true,
    };
    const saborChocolate = {
      ...productoPrueba,
      id: "sabor-chocolate",
      nombre: "Chocolate",
      stockDisponible: 2,
      esSabor: true,
    };
    const heladoDosBochas = {
      ...productoPrueba,
      id: "helado-dos-bochas",
      nombre: "Helado de 2 bochas",
      precio: 2500,
      configuracionVenta: {
        tipo: "sabores",
        cantidadSabores: 2,
        permitirRepetidos: true,
      },
    };

    const { agregarProductoCatalogo, agregarAlCarrito, registrarVenta } =
      useVentasStore.getState();
    await agregarProductoCatalogo(saborVainilla);
    await agregarProductoCatalogo(saborChocolate);
    await agregarProductoCatalogo(heladoDosBochas);

    agregarAlCarrito(heladoDosBochas.id, [saborVainilla.id, saborVainilla.id]);
    agregarAlCarrito(heladoDosBochas.id, [saborVainilla.id, saborChocolate.id]);

    assert.equal(useVentasStore.getState().carrito.length, 2);
    assert.throws(
      () =>
        agregarAlCarrito(heladoDosBochas.id, [
          saborVainilla.id,
          saborVainilla.id,
        ]),
      /No hay suficientes porciones/,
    );
    assert.throws(
      () => agregarAlCarrito(saborVainilla.id),
      /No hay suficientes porciones/,
    );

    const venta = await registrarVenta("Efectivo");
    assert.deepEqual(
      venta.items.map((item) => item.sabores.map((sabor) => sabor.productoId)),
      [
        [saborVainilla.id, saborVainilla.id],
        [saborVainilla.id, saborChocolate.id],
      ],
    );
    assert.equal(
      useVentasStore
        .getState()
        .productos.find((producto) => producto.id === saborVainilla.id)
        .stockDisponible,
      0,
    );
    assert.equal(
      (await ventasDatabase.productos.get(saborChocolate.id)).stockDisponible,
      1,
    );
  });

  it("descuenta el saldo local al vender una bocha individual sin conexión", async () => {
    const sabor = { ...productoPrueba, stockDisponible: 1, esSabor: true };
    await useVentasStore.getState().agregarProductoCatalogo(sabor);
    useVentasStore.getState().agregarAlCarrito(sabor.id);
    assert.throws(
      () => useVentasStore.getState().agregarAlCarrito(sabor.id),
      /No hay suficientes porciones/,
    );

    const venta = await useVentasStore.getState().registrarVenta("Efectivo");

    assert.equal(venta.items[0].productoId, sabor.id);
    assert.equal(useVentasStore.getState().productos[0].stockDisponible, 0);
    assert.equal(
      (await ventasDatabase.productos.get(sabor.id)).stockDisponible,
      0,
    );
  });

  it("guarda venta y cola en una transacción y restaura el catálogo desde IndexedDB", async () => {
    await useVentasStore.getState().agregarProductoCatalogo(productoPrueba);
    useVentasStore.getState().agregarAlCarrito(productoPrueba.id);

    const venta = await useVentasStore.getState().registrarVenta("Efectivo");

    assert.equal(venta.total, productoPrueba.precio);
    assert.equal(useVentasStore.getState().carrito.length, 0);
    assert.equal(await ventasDatabase.ventas.count(), 1);
    assert.equal(await ventasDatabase.colaSincronizacion.count(), 1);
    assert.equal(useVentasStore.getState().cantidadPendiente, 1);

    useVentasStore.setState({ productos: [] });
    await useVentasStore.getState().inicializar();
    assert.equal(useVentasStore.getState().productos[0].id, productoPrueba.id);
  });

  it("no borra carrito ni guarda venta si la transacción local falla", async () => {
    await useVentasStore.getState().agregarProductoCatalogo(productoPrueba);
    useVentasStore.getState().agregarAlCarrito(productoPrueba.id);
    const originalAdd = ventasDatabase.colaSincronizacion.add;
    ventasDatabase.colaSincronizacion.add = () => {
      throw new Error("Fallo de prueba en la cola local.");
    };

    await assert.rejects(
      useVentasStore.getState().registrarVenta("Efectivo"),
      /Fallo de prueba/,
    );
    ventasDatabase.colaSincronizacion.add = originalAdd;

    assert.equal(useVentasStore.getState().carrito.length, 1);
    assert.equal(await ventasDatabase.ventas.count(), 0);
    assert.equal(await ventasDatabase.colaSincronizacion.count(), 0);
  });

  it("revierte stock y conserva el carrito si falla la cola offline", async () => {
    const sabor = { ...productoPrueba, stockDisponible: 2, esSabor: true };
    await useVentasStore.getState().agregarProductoCatalogo(sabor);
    useVentasStore.getState().agregarAlCarrito(sabor.id);
    const originalAdd = ventasDatabase.colaSincronizacion.add;
    ventasDatabase.colaSincronizacion.add = () => {
      throw new Error("Fallo de prueba en la cola local.");
    };

    try {
      await assert.rejects(
        useVentasStore.getState().registrarVenta("Efectivo"),
        /Fallo de prueba/,
      );
    } finally {
      ventasDatabase.colaSincronizacion.add = originalAdd;
    }

    assert.equal(useVentasStore.getState().carrito.length, 1);
    assert.equal(useVentasStore.getState().productos[0].stockDisponible, 2);
    assert.equal(
      (await ventasDatabase.productos.get(sabor.id)).stockDisponible,
      2,
    );
    assert.equal(await ventasDatabase.ventas.count(), 0);
  });

  it("restaura el aviso de intervención desde la cola persistida", async () => {
    await ventasDatabase.open();
    await ventasDatabase.colaSincronizacion.put({
      id: "venta-bloqueada",
      creadaEn: new Date().toISOString(),
      intentos: 0,
      reclamoHasta: 0,
      bloqueada: true,
      codigoError: "INSUFFICIENT_FLAVOR_STOCK",
      ultimoError: "No quedan porciones de vainilla.",
    });

    await useVentasStore.getState().refrescarColaSincronizacion();

    assert.equal(
      useVentasStore.getState().estadoSincronizacion,
      "requiere-intervencion",
    );
    assert.equal(
      useVentasStore.getState().errorSincronizacion,
      "No quedan porciones de vainilla.",
    );
  });
});
