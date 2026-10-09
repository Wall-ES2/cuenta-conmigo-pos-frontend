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
  lineaEditando,
  onConfirmar,
  onCancelar,
}) {
  const productoBase = saboresDisponibles.find((item) => item.id === producto.id) ?? producto;
  const cantidadBase = productoBase.configuracionVenta.cantidadSabores;
  const precioBase = productoBase.precio;
  const [seleccion, setSeleccion] = useState(() =>
    lineaEditando?.sabores?.map((sabor) => sabor.productoId) ??
    Array(cantidadBase).fill(""),
  );
  const [bochaActiva, setBochaActiva] = useState(0);
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
        cantidadUnidades: lineaEditando?.cantidad ?? 1,
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
          carrito: lineaEditando
            ? carrito.filter((linea) => linea.lineId !== lineaEditando.lineId)
            : carrito,
          seleccion: [
            ...seleccion.filter(
              (id, otroIndice) => otroIndice !== indice && id,
            ),
            sabor.id,
          ],
          cantidadUnidades: lineaEditando?.cantidad ?? 1,
        });
      } catch {
        sinStock = true;
      }

      return !sinRepetidos && !sinStock;
    });
  }

  return (
    <div
      className="sales-modal-backdrop flavor-config-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancelar();
      }}
    >
      <section
        aria-labelledby="flavor-config-title"
        aria-modal="true"
        className="sales-modal flavor-config-modal"
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancelar();
        }}
        role="dialog"
      >
        <h2 id="flavor-config-title">Elegir bochas y sabores</h2>
        <p>{producto.nombre} · {seleccion.length} {seleccion.length === 1 ? "bocha" : "bochas"}. Los sabores descuentan stock; el precio es el del cucurucho.</p>

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
            <div aria-label="Seleccionar bocha para editar" className="flavor-scoop-tabs">
              {seleccion.map((id, indice) => (
                <button aria-pressed={bochaActiva === indice} className="flavor-scoop-tab" key={indice} onClick={() => setBochaActiva(indice)} type="button">
                  <span>Bocha {indice + 1}</span>
                  <small>{sabores.find((sabor) => sabor.id === id)?.nombre ?? "Seleccionar sabor"}</small>
                </button>
              ))}
            </div>
            <fieldset className="flavor-picker">
              <legend>Sabores disponibles para la bocha {bochaActiva + 1}</legend>
              <div className="flavor-picker-grid">
                {opcionesDisponibles(bochaActiva).map((sabor) => (
                  <button aria-pressed={seleccion[bochaActiva] === sabor.id} className="flavor-choice" key={sabor.id} onClick={() => { setSeleccion((actual) => actual.map((id, index) => index === bochaActiva ? sabor.id : id)); setError(""); }} type="button">
                    <strong>{sabor.nombre}</strong>
                    <small>{Number.isInteger(sabor.stockDisponible) ? `${sabor.stockDisponible} porciones` : "Sin conteo"}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="sales-modal-total"><span>Precio del cucurucho</span><strong>{formatearPrecio(precioBase)}</strong></div>
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
