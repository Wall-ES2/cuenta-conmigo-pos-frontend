import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizarProductoApi,
  serializarProductoApi,
} from "./productosApi.js";

describe("normalizarProductoApi", () => {
  it("adapta el contrato REST al modelo local en español", () => {
    assert.deepEqual(
      normalizarProductoApi({
        id: "p-1",
        name: "Café",
        category: "cafeteria",
        price: 1800,
        detail: "Taza",
        imageUrl: "https://cdn.example.test/cafe.jpg",
      }),
      {
        id: "p-1",
        nombre: "Café",
        categoria: "cafeteria",
        precio: 1800,
        detalle: "Taza",
        imagenUrl: "https://cdn.example.test/cafe.jpg",
      },
    );
  });

  it("rechaza respuestas con campos requeridos inválidos", () => {
    assert.throws(
      () =>
        normalizarProductoApi({
          id: "p-1",
          name: "Café",
          category: "cafeteria",
          price: "1800",
        }),
      /campos inválidos/,
    );
  });

  it("permite que productos existentes no tengan imagen", () => {
    assert.equal(
      normalizarProductoApi({
        id: "p-2",
        name: "Medialuna",
        category: "panaderia",
        price: 900,
      }).imagenUrl,
      "",
    );
  });

  it("rechaza una URL de imagen con protocolo no seguro", () => {
    assert.throws(
      () =>
        normalizarProductoApi({
          id: "p-3",
          name: "Producto",
          category: "otros",
          price: 1000,
          imageUrl: "javascript:alert(1)",
        }),
      /HTTP o HTTPS/,
    );
  });

  it("normaliza sabores con porciones disponibles y producto configurable", () => {
    assert.deepEqual(
      normalizarProductoApi({
        id: "helado-2-bochas",
        name: "Helado de 2 bochas",
        category: "helados",
        price: 2500,
        isFlavor: false,
        salesConfiguration: {
          type: "flavors",
          selectionCount: 2,
          allowDuplicates: true,
        },
        minimumPortions: null,
      }),
      {
        id: "helado-2-bochas",
        nombre: "Helado de 2 bochas",
        categoria: "helados",
        precio: 2500,
        detalle: "",
        imagenUrl: "",
        esSabor: false,
        configuracionVenta: {
          tipo: "sabores",
          cantidadSabores: 2,
          permitirRepetidos: true,
        },
      },
    );

    assert.equal(
      normalizarProductoApi({
        id: "sabor-vainilla",
        name: "Vainilla",
        category: "helados",
        price: 100,
        isFlavor: true,
        availablePortions: 4,
        minimumPortions: 2,
      }).stockDisponible,
      4,
    );
    assert.equal(
      normalizarProductoApi({
        id: "sabor-vainilla",
        name: "Vainilla",
        category: "helados",
        price: 100,
        isFlavor: true,
        availablePortions: 4,
        minimumPortions: 2,
      }).stockMinimo,
      2,
    );
  });

  it("serializa el contrato esperado para sabores y ventas configurables", () => {
    assert.deepEqual(
      serializarProductoApi({
        id: "helado-2-bochas",
        nombre: "Helado de 2 bochas",
        categoria: "helados",
        precio: 2500,
        detalle: "",
        imagenUrl: "",
        configuracionVenta: {
          tipo: "sabores",
          cantidadSabores: 2,
          permitirRepetidos: false,
        },
      }),
      {
        id: "helado-2-bochas",
        name: "Helado de 2 bochas",
        category: "helados",
        price: 2500,
        unitCost: null,
        detail: "",
        imageUrl: null,
        isFlavor: false,
        tracksInventory: false,
        salesConfiguration: {
          type: "flavors",
          selectionCount: 2,
          allowDuplicates: false,
        },
        minimumPortions: null,
      },
    );
    assert.equal(
      serializarProductoApi({
        id: "sabor-vainilla",
        nombre: "Vainilla",
        categoria: "helados",
        precio: 100,
        esSabor: true,
        stockMinimo: 3,
      }).minimumPortions,
      3,
    );
  });

  it("rechaza stocks fraccionarios negativos y configuraciones contradictorias", () => {
    assert.throws(
      () =>
        normalizarProductoApi({
          id: "sabor-vainilla",
          name: "Vainilla",
          category: "helados",
          price: 100,
          isFlavor: true,
          availablePortions: -1,
        }),
      /disponibilidad.*inválida/,
    );

    assert.throws(
      () =>
        normalizarProductoApi({
          id: "incorrecto",
          name: "Producto",
          category: "cafeteria",
          price: 1000,
          isFlavor: true,
        }),
      /debe pertenecer a Helados/,
    );
  });
});
