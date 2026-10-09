import { useEffect, useState } from "react";
import { categorias, formatearPrecio } from "../ventas/data/productos.js";
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

function obtenerEstadoStock(producto) {
  if (!Number.isInteger(producto.stockDisponible)) return "sin-conteo";
  if (producto.stockDisponible === 0) return "agotado";
  const minimo = Number.isInteger(producto.stockMinimo) ? producto.stockMinimo : 0;
  if (producto.stockDisponible <= minimo) return "reponer";
  if (minimo > 0 && producto.stockDisponible <= minimo * 2) return "por-agotarse";
  return "en-stock";
}

const estadosStock = [
  { id: "todos", nombre: "Todos los estados" },
  { id: "agotado", nombre: "Agotado" },
  { id: "reponer", nombre: "Reponer" },
  { id: "por-agotarse", nombre: "Por agotarse" },
  { id: "en-stock", nombre: "En stock" },
  { id: "sin-conteo", nombre: "Sin conteo" },
];

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
  const productosInventariables = productos
    .filter((producto) => producto.controlaStock || producto.esSabor)
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
  const [minimosEditados, setMinimosEditados] = useState({});
  const [guardandoMinimo, setGuardandoMinimo] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todos");
  const [estadoActivo, setEstadoActivo] = useState("todos");
  const [orden, setOrden] = useState({ campo: null, direccion: "asc" });
  const productosFiltrados = productosInventariables
    .filter((producto) => categoriaActiva === "todos" || producto.categoria === categoriaActiva)
    .filter((producto) => estadoActivo === "todos" || obtenerEstadoStock(producto) === estadoActivo)
    .sort((a, b) => {
      if (orden.campo === "stock") {
        const stockA = a.stockDisponible;
        const stockB = b.stockDisponible;
        if (!Number.isInteger(stockA) && !Number.isInteger(stockB)) return 0;
        if (!Number.isInteger(stockA)) return 1;
        if (!Number.isInteger(stockB)) return -1;
      }
      const comparacion = orden.campo === "stock"
        ? a.stockDisponible - b.stockDisponible
        : a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      return orden.direccion === "asc" ? comparacion : -comparacion;
    });

  function alternarOrden(campo) {
    setOrden((actual) => {
      if (actual.campo !== campo) return { campo, direccion: "asc" };
      if (actual.direccion === "asc") return { campo, direccion: "desc" };
      return { campo: null, direccion: "asc" };
    });
  }

  const idProductoActivo = productosInventariables.some(
    (producto) => producto.id === productoSeleccionado,
  )
    ? productoSeleccionado
    : (productosInventariables[0]?.id ?? "");
  const productoActual = productosInventariables.find(
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

  async function guardarMinimo(producto) {
    const valor = Number(minimosEditados[producto.id] ?? producto.stockMinimo ?? 0);
    if (!Number.isInteger(valor) || valor < 0) {
      setError("El stock mínimo debe ser un entero igual o mayor que cero.");
      return;
    }
    setGuardandoMinimo(producto.id);
    setError("");
    try {
      const actualizado = await actualizarProductoApi({ ...producto, stockMinimo: valor });
      await actualizarProductoCatalogo(producto.id, { stockMinimo: actualizado.stockMinimo ?? valor });
      setMinimosEditados((actuales) => { const siguientes = { ...actuales }; delete siguientes[producto.id]; return siguientes; });
      setMensaje(`Stock mínimo de ${producto.nombre} actualizado a ${valor}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar el stock mínimo.");
    } finally {
      setGuardandoMinimo("");
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
        `Movimiento registrado. Saldo actual: ${movimiento.saldoPosterior} ${productoActual.esSabor ? "porciones" : "unidades"}.`,
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
            Existencias de productos y sus movimientos registrados.
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
            Productos con control de stock ({productosInventariables.length})
          </h2>
          <span className="text-xs text-slate-500">
            Las existencias confirmadas provienen del backend.
          </span>
        </div>
        <div aria-label="Filtrar inventario por categoría" className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3" role="group">
          {[{ id: "todos", nombre: "Todas" }, ...categorias.filter(({ id }) => id !== "todos" && productosInventariables.some((producto) => producto.categoria === id))]
            .map((categoria) => (
              <button
                aria-pressed={categoriaActiva === categoria.id}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${categoriaActiva === categoria.id ? "bg-emerald-800 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                key={categoria.id}
                onClick={() => setCategoriaActiva(categoria.id)}
                type="button"
              >
                {categoria.nombre}
              </button>
            ))}
        </div>
        {!inicializado ? (
          <p className="p-5 text-sm text-slate-600">
            Cargando catálogo local...
          </p>
        ) : productosInventariables.length === 0 ? (
          <div className="p-5 text-sm text-slate-600">
            Aún no hay productos con control de stock. Agrégalos desde Administración.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th aria-sort={orden.campo === "nombre" ? (orden.direccion === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 font-semibold">
                    <button className="inline-flex items-center gap-1 hover:text-slate-900" onClick={() => alternarOrden("nombre")} type="button">Producto <span aria-hidden="true">{orden.campo === "nombre" ? (orden.direccion === "asc" ? "↑" : "↓") : "↕"}</span></button>
                  </th>
                  <th aria-sort={orden.campo === "stock" ? (orden.direccion === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 font-semibold">
                    <button className="inline-flex items-center gap-1 hover:text-slate-900" onClick={() => alternarOrden("stock")} type="button">Stock <span aria-hidden="true">{orden.campo === "stock" ? (orden.direccion === "asc" ? "↑" : "↓") : "↕"}</span></button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Stock mínimo</th>
                  <th className="px-4 py-3 font-semibold">
                    <label className="flex flex-col gap-1.5">Estado
                      <select aria-label="Filtrar por estado de stock" className="max-w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-700" onChange={(event) => setEstadoActivo(event.target.value)} value={estadoActivo}>
                        {estadosStock.map((estado) => <option key={estado.id} value={estado.id}>{estado.nombre}</option>)}
                      </select>
                    </label>
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    Precio de referencia
                  </th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productosFiltrados.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={6}>No hay productos en esta categoría.</td></tr>
                ) : productosFiltrados.map((producto) => (
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
                            ? producto.esSabor ? "porción" : "unidad"
                            : producto.esSabor ? "porciones" : "unidades"}
                        </span>
                      ) : (
                        <span className="text-amber-700">
                          Sin conteo inicial
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-2">
                        <input aria-label={`Stock mínimo de ${producto.nombre}`} className="w-20 rounded-md border border-slate-300 px-2 py-1.5" min="0" onChange={(event) => setMinimosEditados((actuales) => ({ ...actuales, [producto.id]: event.target.value }))} type="number" value={minimosEditados[producto.id] ?? producto.stockMinimo ?? 0} />
                        <button className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50" disabled={guardandoMinimo === producto.id || String(minimosEditados[producto.id] ?? producto.stockMinimo ?? 0) === String(producto.stockMinimo ?? 0)} onClick={() => guardarMinimo(producto)} type="button">{guardandoMinimo === producto.id ? "Guardando" : "Guardar"}</button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${{ "agotado": "text-red-700", "reponer": "text-red-700", "por-agotarse": "text-amber-800", "sin-conteo": "text-slate-500", "en-stock": "text-emerald-700" }[obtenerEstadoStock(producto)]}`} role="status">
                        {{ "agotado": "Agotado", "reponer": "Reponer", "por-agotarse": "Por agotarse", "en-stock": "En stock", "sin-conteo": "Cargar stock" }[obtenerEstadoStock(producto)]}
                      </span>
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
                          Cargar stock
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
                ? `${productoActual.stockDisponible} ${productoActual.esSabor ? "porciones" : "unidades"}`
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
                  <option value="in">Sumar unidades</option>
                  <option value="out">Restar unidades</option>
                </select>
              </label>
            )}
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="movimiento-cantidad"
            >
              Cantidad ({productoActual.esSabor ? "porciones" : "unidades"})
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
