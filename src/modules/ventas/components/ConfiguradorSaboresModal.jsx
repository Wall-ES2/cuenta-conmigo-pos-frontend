import { useState } from "react";
import { formatearPrecio } from "../data/productos.js";
import {
  validarDisponibilidadSaboresEnCarrito,
  validarSeleccionSabores,
} from "../domain/configuracionSabores.js";

function ConfiguradorSaboresModal({
  producto,
  saboresDisponibles,
  carrito = [],
  onConfirmar,
  onCancelar,
}) {
  const cantidadSabores = producto.configuracionVenta.cantidadSabores;
  const [seleccion, setSeleccion] = useState(() =>
    Array(cantidadSabores).fill(""),
  );
  const [error, setError] = useState("");

  const sabores = saboresDisponibles
    .filter((sabor) => sabor.esSabor && sabor.id !== producto.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const haySaboresConConteo = sabores.some((sabor) =>
    Number.isInteger(sabor.stockDisponible),
  );
  const hayPorcionesDisponibles = sabores.some(
    (sabor) =>
      Number.isInteger(sabor.stockDisponible) && sabor.stockDisponible > 0,
  );

  function confirmar(event) {
    event.preventDefault();

    try {
      const idsSeleccionados = validarSeleccionSabores({
        producto,
        saboresDisponibles: sabores,
        seleccion,
      });
      onConfirmar(idsSeleccionados);
      setError("");
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "No se pudieron agregar estos sabores al carrito.",
      );
    }
  }

  function opcionesDisponibles(indice) {
    return sabores.filter((sabor) => {
      const cantidadEnOtrasBochas = seleccion.reduce(
        (total, id, otroIndice) =>
          total + (otroIndice !== indice && id === sabor.id ? 1 : 0),
        0,
      );
      const sinRepetidos =
        !producto.configuracionVenta.permitirRepetidos &&
        cantidadEnOtrasBochas > 0;
      let sinStock = false;
      try {
        validarDisponibilidadSaboresEnCarrito({
          productos: saboresDisponibles,
          carrito,
          seleccion: [
            ...seleccion.filter(
              (id, otroIndice) => otroIndice !== indice && id,
            ),
            sabor.id,
          ],
        });
      } catch {
        sinStock = true;
      }

      return !sinRepetidos && !sinStock;
    });
  }

  return (
    <div
      className="sales-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancelar();
      }}
    >
      <section
        aria-labelledby="flavor-config-title"
        aria-modal="true"
        className="sales-modal"
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancelar();
        }}
        role="dialog"
      >
        <h2 id="flavor-config-title">Elegir sabores</h2>
        <p>
          {producto.nombre} · {cantidadSabores}{" "}
          {cantidadSabores === 1 ? "bocha" : "bochas"} ·{" "}
          {formatearPrecio(producto.precio)}
        </p>

        {sabores.length === 0 ? (
          <p className="sales-form-error" role="alert">
            No hay sabores habilitados. Configura al menos un producto de
            Helados como sabor.
          </p>
        ) : (
          <form className="grid gap-3" onSubmit={confirmar}>
            {!haySaboresConConteo && (
              <p className="sales-form-error" role="alert">
                Ningún sabor tiene carga inicial. Registra las porciones en
                Inventario para habilitar la venta.
              </p>
            )}
            {haySaboresConConteo && !hayPorcionesDisponibles && (
              <p className="sales-form-error" role="alert">
                No quedan porciones disponibles de los sabores configurados.
              </p>
            )}
            {seleccion.map((idSeleccionado, indice) => (
              <label
                className="text-sm font-semibold text-slate-700"
                htmlFor={`sabor-bocha-${indice}`}
                key={indice}
              >
                Bocha {indice + 1}
                <select
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  id={`sabor-bocha-${indice}`}
                  onChange={(event) => {
                    setSeleccion((actual) =>
                      actual.map((id, index) =>
                        index === indice ? event.target.value : id,
                      ),
                    );
                    setError("");
                  }}
                  required
                  value={idSeleccionado}
                >
                  <option value="">Seleccionar sabor</option>
                  {opcionesDisponibles(indice).map((sabor) => (
                    <option key={sabor.id} value={sabor.id}>
                      {sabor.nombre}
                      {Number.isInteger(sabor.stockDisponible)
                        ? ` · ${sabor.stockDisponible} porciones`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {error && (
              <p className="sales-form-error" role="alert">
                {error}
              </p>
            )}
            <div className="sales-modal-actions">
              <button
                className="sales-modal-cancel"
                onClick={onCancelar}
                type="button"
              >
                Cancelar
              </button>
              <button className="sales-modal-confirm" type="submit">
                Agregar al carrito
              </button>
            </div>
          </form>
        )}

        {sabores.length === 0 && (
          <div className="sales-modal-actions">
            <button
              className="sales-modal-cancel"
              onClick={onCancelar}
              type="button"
            >
              Cerrar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default ConfiguradorSaboresModal;
