import { useEffect, useState } from "react";
import { formatearPrecio } from "../ventas/data/productos.js";
import { useVentasStore } from "../ventas/store/useVentasStore.js";
import {
  listarMovimientosInventarioApi,
  normalizarMovimientoEntrada,
  registrarMovimientoInventarioApi,
} from "./services/inventarioApi.js";

const tiposMovimiento = [
  { id: "opening", nombre: "Carga inicial" },
  { id: "receipt", nombre: "Ingreso / reposición" },
  { id: "return", nombre: "Devolución apta para venta" },
  { id: "waste", nombre: "Merma / descarte" },
  { id: "adjustment", nombre: "Ajuste de conteo" },
];

const formularioInicial = {
  type: "receipt",
  cantidad: "",
  direccion: "in",
  reason: "",
};

function InventarioPage() {
  const productos = useVentasStore((state) => state.productos);
  const inicializado = useVentasStore((state) => state.inicializado);
  const errorAlmacenamiento = useVentasStore(
    (state) => state.errorAlmacenamiento,
  );
  const errorCatalogoApi = useVentasStore((state) => state.errorCatalogoApi);
  const actualizarProductoCatalogo = useVentasStore(
    (state) => state.actualizarProductoCatalogo,
  );
  const sabores = productos
    .filter((producto) => producto.esSabor)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const idProductoActivo = sabores.some(
    (producto) => producto.id === productoSeleccionado,
  )
    ? productoSeleccionado
    : (sabores[0]?.id ?? "");
  const productoActual = sabores.find(
    (producto) => producto.id === idProductoActivo,
  );
  const historialCargando =
    cargandoMovimientos || (!productoSeleccionado && Boolean(idProductoActivo));

  useEffect(() => {
    let activo = true;

    if (!idProductoActivo) return undefined;

    listarMovimientosInventarioApi(idProductoActivo)
      .then((lista) => {
        if (activo) setMovimientos(lista);
      })
      .catch((historyError) => {
        if (activo) {
          setErrorHistorial(
            historyError instanceof Error
              ? historyError.message
              : "No se pudo cargar el historial de movimientos.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargandoMovimientos(false);
      });

    return () => {
      activo = false;
    };
  }, [idProductoActivo]);

  function abrirMovimiento(producto, type = "receipt") {
    setProductoSeleccionado(producto.id);
    setMovimientos([]);
    setErrorHistorial("");
    setCargandoMovimientos(true);
    setFormulario({ ...formularioInicial, type });
    setIdempotencyKey("");
    setError("");
    setMensaje("");
    setModalAbierto(true);
  }

  function actualizarFormulario(cambio) {
    setFormulario((actual) => ({ ...actual, ...cambio }));
    setIdempotencyKey("");
    setError("");
  }

  async function recargarHistorial() {
    if (!idProductoActivo) return;
    setCargandoMovimientos(true);
    setErrorHistorial("");
    try {
      setMovimientos(await listarMovimientosInventarioApi(idProductoActivo));
    } catch (historyError) {
      setErrorHistorial(
        historyError instanceof Error
          ? historyError.message
          : "No se pudo cargar el historial de movimientos.",
      );
    } finally {
      setCargandoMovimientos(false);
    }
  }

  async function guardarMovimiento(event) {
    event.preventDefault();
    if (!productoActual || guardando) return;

    const cantidad = Number(formulario.cantidad);
    const quantityDelta =
      formulario.type === "waste" ||
      (formulario.type === "adjustment" && formulario.direccion === "out")
        ? -cantidad
        : cantidad;

    let payload;
    try {
      payload = normalizarMovimientoEntrada({
        type: formulario.type,
        quantityDelta,
        reason: formulario.reason,
      });
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Revisa los datos del movimiento.",
      );
      return;
    }

    const clave = idempotencyKey || globalThis.crypto.randomUUID();
    setIdempotencyKey(clave);
    setGuardando(true);
    setError("");

    try {
      const movimiento = await registrarMovimientoInventarioApi(
        productoActual.id,
        payload,
        clave,
      );
      await actualizarProductoCatalogo(productoActual.id, {
        stockDisponible: movimiento.saldoPosterior,
      });
      setMovimientos((actuales) => [movimiento, ...actuales].slice(0, 25));
      setMensaje(
        `Movimiento registrado. Saldo actual: ${movimiento.saldoPosterior} porciones.`,
      );
      setModalAbierto(false);
      setIdempotencyKey("");
      setFormulario(formularioInicial);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo registrar el movimiento. No se cambió el saldo local.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Inventario
          </h1>
          <p className="mt-2 text-slate-600">
            Existencias de sabores de helado y movimientos registrados.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={!productoActual}
          onClick={() => productoActual && abrirMovimiento(productoActual)}
          type="button"
        >
          Registrar movimiento
        </button>
      </header>

      {(errorAlmacenamiento || errorCatalogoApi) && (
        <p
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {errorAlmacenamiento || errorCatalogoApi}
        </p>
      )}
      {mensaje && (
        <p
          className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          {mensaje}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">
            Sabores ({sabores.length})
          </h2>
          <span className="text-xs text-slate-500">
            Las existencias confirmadas provienen del backend.
          </span>
        </div>
        {!inicializado ? (
          <p className="p-5 text-sm text-slate-600">
            Cargando catálogo local...
          </p>
        ) : sabores.length === 0 ? (
          <div className="p-5 text-sm text-slate-600">
            Aún no hay sabores registrados. En Administración, crea productos de
            categoría Helados y márcalos como sabores.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Sabor</th>
                  <th className="px-4 py-3 font-semibold">Porciones</th>
                  <th className="px-4 py-3 font-semibold">Mínimo</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">
                    Precio de referencia
                  </th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sabores.map((producto) => (
                  <tr
                    className={
                      producto.id === productoSeleccionado
                        ? "bg-emerald-50/40"
                        : ""
                    }
                    key={producto.id}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {producto.nombre}
                    </td>
                    <td className="px-4 py-3">
                      {Number.isInteger(producto.stockDisponible) ? (
                        <span
                          className={
                            producto.stockDisponible === 0
                              ? "font-semibold text-red-700"
                              : "text-slate-700"
                          }
                        >
                          {producto.stockDisponible}{" "}
                          {producto.stockDisponible === 1
                            ? "porción"
                            : "porciones"}
                        </span>
                      ) : (
                        <span className="text-amber-700">
                          Sin conteo inicial
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {Number.isInteger(producto.stockMinimo)
                        ? producto.stockMinimo
                        : "No configurado"}
                    </td>
                    <td className="px-4 py-3">
                      {Number.isInteger(producto.stockDisponible) &&
                      Number.isInteger(producto.stockMinimo) &&
                      producto.stockDisponible <= producto.stockMinimo ? (
                        <span
                          className="font-semibold text-amber-800"
                          role="status"
                        >
                          Reponer
                        </span>
                      ) : (
                        <span className="text-slate-500">En stock</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatearPrecio(producto.precio)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setMovimientos([]);
                            setErrorHistorial("");
                            setCargandoMovimientos(true);
                            setProductoSeleccionado(producto.id);
                          }}
                          type="button"
                        >
                          Historial
                        </button>
                        <button
                          className="rounded-md border border-emerald-800 px-3 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-50"
                          onClick={() =>
                            abrirMovimiento(
                              producto,
                              producto.stockDisponible === undefined
                                ? "opening"
                                : "receipt",
                            )
                          }
                          type="button"
                        >
                          {producto.stockDisponible === undefined
                            ? "Conteo inicial"
                            : "Entrada"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {productoActual && (
        <section aria-labelledby="historial-heading" className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className="text-lg font-semibold text-slate-900"
                id="historial-heading"
              >
                Movimientos: {productoActual.nombre}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Cada ajuste conserva usuario, fecha y saldo posterior.
              </p>
            </div>
            <button
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={historialCargando}
              onClick={recargarHistorial}
              type="button"
            >
              {historialCargando ? "Actualizando..." : "Actualizar historial"}
            </button>
          </div>
          {errorHistorial ? (
            <p
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              role="alert"
            >
              No se pudo cargar el historial: {errorHistorial}
            </p>
          ) : movimientos.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              {historialCargando
                ? "Cargando movimientos..."
                : "No hay movimientos para este sabor."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {movimientos.map((movimiento) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  key={movimiento.id}
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {tiposMovimiento.find(({ id }) => id === movimiento.tipo)
                        ?.nombre ?? movimiento.tipo}
                      {" · "}
                      {movimiento.usuario || "Usuario sin informar"}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {new Date(movimiento.creadoEn).toLocaleString("es-AR")} ·{" "}
                      {movimiento.motivo || "Sin motivo"}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {movimiento.cantidad > 0 ? "+" : ""}
                    {movimiento.cantidad} · saldo {movimiento.saldoPosterior}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {modalAbierto && productoActual && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4"
          role="presentation"
        >
          <form
            aria-labelledby="movimiento-form-title"
            aria-modal="true"
            className="my-auto grid w-full max-w-lg gap-4 rounded-xl bg-white p-6 shadow-xl"
            onSubmit={guardarMovimiento}
            role="dialog"
          >
            <h2
              className="text-xl font-semibold text-slate-900"
              id="movimiento-form-title"
            >
              Movimiento · {productoActual.nombre}
            </h2>
            <p className="text-sm text-slate-600">
              Saldo actual:{" "}
              {Number.isInteger(productoActual.stockDisponible)
                ? `${productoActual.stockDisponible} porciones`
                : "sin conteo inicial"}
            </p>
            {error && (
              <p
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="movimiento-tipo"
            >
              Tipo de movimiento
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                id="movimiento-tipo"
                onChange={(event) =>
                  actualizarFormulario({ type: event.target.value })
                }
                value={formulario.type}
              >
                {tiposMovimiento
                  .filter(
                    ({ id }) =>
                      id !== "opening" ||
                      productoActual.stockDisponible === undefined,
                  )
                  .map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
              </select>
            </label>
            {formulario.type === "adjustment" && (
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="movimiento-direccion"
              >
                Dirección del ajuste
                <select
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  id="movimiento-direccion"
                  onChange={(event) =>
                    actualizarFormulario({ direccion: event.target.value })
                  }
                  value={formulario.direccion}
                >
                  <option value="in">Sumar porciones</option>
                  <option value="out">Restar porciones</option>
                </select>
              </label>
            )}
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="movimiento-cantidad"
            >
              Porciones
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                id="movimiento-cantidad"
                min="1"
                onChange={(event) =>
                  actualizarFormulario({ cantidad: event.target.value })
                }
                required
                step="1"
                type="number"
                value={formulario.cantidad}
              />
            </label>
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="movimiento-motivo"
            >
              Motivo (obligatorio)
              <textarea
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                id="movimiento-motivo"
                maxLength={240}
                onChange={(event) =>
                  actualizarFormulario({ reason: event.target.value })
                }
                required
                rows={2}
                value={formulario.reason}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={guardando}
                onClick={() => setModalAbierto(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
                disabled={guardando}
                type="submit"
              >
                {guardando ? "Guardando..." : "Registrar movimiento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default InventarioPage;
