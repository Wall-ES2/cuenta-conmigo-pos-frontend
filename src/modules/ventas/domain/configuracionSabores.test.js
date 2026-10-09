import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validarDisponibilidadSaboresEnCarrito,
  normalizarConfiguracionVenta,
  validarSeleccionSabores,
} from "./configuracionSabores.js";

const productoConfigurable = {
  id: "helado-dos-bochas",
  configuracionVenta: {
    tipo: "sabores",
    cantidadSabores: 2,
    permitirRepetidos: true,
  },
};

const sabores = [
  { id: "vainilla", nombre: "Vainilla", esSabor: true, stockDisponible: 3 },
  { id: "chocolate", nombre: "Chocolate", esSabor: true, stockDisponible: 1 },
  { id: "agua", nombre: "Agua mineral", esSabor: false, stockDisponible: 20 },
];

describe("configuracion de sabores", () => {
  it("normaliza la opción de repetir sabores y admite hasta seis selecciones", () => {
    assert.deepEqual(
      normalizarConfiguracionVenta({
        tipo: "sabores",
        cantidadSabores: 2,
      }),
      {
        tipo: "sabores",
        cantidadSabores: 2,
        permitirRepetidos: true,
      },
    );

    assert.throws(
      () =>
        normalizarConfiguracionVenta({ tipo: "sabores", cantidadSabores: 7 }),
      /no es válida/,
    );
  });

  it("acepta sabores válidos y permite repetirlos cuando está configurado", () => {
    assert.deepEqual(
      validarSeleccionSabores({
        producto: productoConfigurable,
        saboresDisponibles: sabores,
        seleccion: ["vainilla", "vainilla"],
      }),
      ["vainilla", "vainilla"],
    );
  });

  it("rechaza cantidad incompleta, sabores que no son opciones y duplicados no permitidos", () => {
    assert.throws(
      () =>
        validarSeleccionSabores({
          producto: productoConfigurable,
          saboresDisponibles: sabores,
          seleccion: ["vainilla"],
        }),
      /exactamente 2/,
    );

    assert.throws(
      () =>
        validarSeleccionSabores({
          producto: productoConfigurable,
          saboresDisponibles: sabores,
          seleccion: ["vainilla", "agua"],
        }),
      /ya no está disponible/,
    );

    assert.throws(
      () =>
        validarSeleccionSabores({
          producto: {
            ...productoConfigurable,
            configuracionVenta: {
              ...productoConfigurable.configuracionVenta,
              permitirRepetidos: false,
            },
          },
          saboresDisponibles: sabores,
          seleccion: ["vainilla", "vainilla"],
        }),
      /No se puede repetir/,
    );
  });

  it("rechaza selecciones que exceden el stock conocido", () => {
    assert.throws(
      () =>
        validarSeleccionSabores({
          producto: productoConfigurable,
          saboresDisponibles: sabores,
          seleccion: ["chocolate", "chocolate"],
        }),
      /No hay suficientes porciones/,
    );
  });

  it("rechaza vender un sabor sin carga inicial de stock", () => {
    assert.throws(
      () =>
        validarSeleccionSabores({
          producto: productoConfigurable,
          saboresDisponibles: [
            { id: "vainilla", nombre: "Vainilla", esSabor: true },
          ],
          seleccion: ["vainilla", "vainilla"],
        }),
      /no tiene un conteo inicial/,
    );
  });

  it("suma las porciones reservadas en líneas distintas del carrito", () => {
    assert.throws(
      () =>
        validarDisponibilidadSaboresEnCarrito({
          productos: sabores.map((sabor) =>
            sabor.id === "vainilla" ? { ...sabor, stockDisponible: 1 } : sabor,
          ),
          carrito: [{ cantidad: 1, sabores: [{ productoId: "vainilla" }] }],
          seleccion: ["vainilla"],
        }),
      /No hay suficientes porciones/,
    );
  });
});
