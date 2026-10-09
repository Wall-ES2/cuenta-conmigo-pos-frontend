import { useEffect, useState } from "react";
import { formatearPrecio } from "../ventas/data/productos.js";
import { useVentasStore } from "../ventas/store/useVentasStore.js";
import { actualizarProductoApi } from "../administracion/services/productosApi.js";
import { listarCategoriasProductos } from "../administracion/services/categoriasCatalogo.js";
import { useAuthStore } from "../../stores/useAuthStore.js";
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
const claveInformesReposicion = "cuenta-conmigo-informes-reposicion-v1";

function leerInformesReposicion() {
  try {
    const informes = JSON.parse(globalThis.localStorage?.getItem(claveInformesReposicion) ?? "[]");
    return Array.isArray(informes) ? informes : [];
  } catch {
    return [];
  }
}

function InventarioPage() {
  const usuarioActual = useAuthStore((state) => state.usuario);
  const esAdministrador = usuarioActual?.role === "Administrador";
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
  const [informesReposicion, setInformesReposicion] = useState(leerInformesReposicion);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [minimosEditados, setMinimosEditados] = useState({});
  const [guardandoMinimos, setGuardandoMinimos] = useState(false);
  const [modoInventario, setModoInventario] = useState("");
  const [cantidadesCarga, setCantidadesCarga] = useState({});
  const [detallesCarga, setDetallesCarga] = useState({});
  const [clavesCarga, setClavesCarga] = useState({});
  const [guardandoCargas, setGuardandoCargas] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState("todos");
  const [estadoActivo, setEstadoActivo] = useState("todos");
  const [soloReposiciones, setSoloReposiciones] = useState(false);
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
  const movimientosVisibles = soloReposiciones
    ? movimientos.filter((movimiento) => movimiento.tipo === "receipt")
    : movimientos;

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

  async function guardarMinimos() {
    const cambios = productosInventariables.filter((producto) =>
      String(minimosEditados[producto.id] ?? producto.stockMinimo ?? 0) !== String(producto.stockMinimo ?? 0),
    );
    const invalidos = cambios.filter((producto) => {
      const minimo = Number(minimosEditados[producto.id]);
      return !Number.isInteger(minimo) || minimo < 0;
    });
    if (invalidos.length) {
      setError(`Revisa el mínimo de ${invalidos.map(({ nombre }) => nombre).join(", ")}. Usa enteros iguales o mayores que cero.`);
      return;
    }
    if (!cambios.length) {
      setModoInventario("");
      return;
    }
    setGuardandoMinimos(true);
    setError("");
    const fallidos = [];
    let actualizados = 0;
    for (const producto of cambios) {
      const valor = Number(minimosEditados[producto.id]);
      try {
        const actualizado = await actualizarProductoApi({ ...producto, stockMinimo: valor });
        await actualizarProductoCatalogo(producto.id, { stockMinimo: actualizado.stockMinimo ?? valor });
        actualizados += 1;
      } catch (saveError) {
        fallidos.push(`${producto.nombre}: ${saveError instanceof Error ? saveError.message : "no se pudo guardar"}`);
      }
    }
    if (fallidos.length) {
      setError(`Se guardaron ${actualizados} mínimos. ${fallidos.join("; ")}`);
    } else {
      setMensaje(`Se actualizaron ${actualizados} mínimos de stock.`);
      setModoInventario("");
    }
    setGuardandoMinimos(false);
  }

  async function guardarCargas() {
    const conCantidad = productosInventariables.filter((producto) => cantidadesCarga[producto.id] !== undefined && cantidadesCarga[producto.id] !== "");
    if (!conCantidad.length) {
      setError("Ingresa la cantidad de stock para al menos un producto.");
      return;
    }
    const cargas = [];
    try {
      for (const producto of conCantidad) {
        cargas.push({
          producto,
          payload: normalizarMovimientoEntrada({
            type: Number.isInteger(producto.stockDisponible) ? "receipt" : "opening",
            quantityDelta: Number(cantidadesCarga[producto.id]),
            reason: detallesCarga[producto.id]?.trim() || "Carga de stock",
          }),
        });
      }
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Revisa las cantidades y detalles de las cargas.");
      return;
    }

    setGuardandoCargas(true);
    setError("");
    const registradas = [];
    const fallidas = [];
    const clavesUsadas = { ...clavesCarga };
    for (const { producto, payload } of cargas) {
      const clave = clavesUsadas[producto.id] || globalThis.crypto.randomUUID();
      clavesUsadas[producto.id] = clave;
      try {
        const registrado = await registrarMovimientoInventarioApi(producto.id, payload, clave);
        await actualizarProductoCatalogo(producto.id, { stockDisponible: registrado.saldoPosterior });
        registradas.push({
          producto,
          movimiento: {
            ...registrado,
            usuario: registrado.usuario || usuarioActual?.name || usuarioActual?.nombre || usuarioActual?.email || "Empleado",
          },
        });
        delete clavesUsadas[producto.id];
      } catch (saveError) {
        fallidas.push(`${producto.nombre}: ${saveError instanceof Error ? saveError.message : "no se pudo registrar"}`);
      }
    }
    setClavesCarga(clavesUsadas);
    if (registradas.length) {
      const informe = {
        id: globalThis.crypto.randomUUID(),
        fecha: registradas[0].movimiento.creadoEn || new Date().toISOString(),
        empleado: registradas[0].movimiento.usuario || usuarioActual?.name || usuarioActual?.nombre || usuarioActual?.email || "Empleado",
        productos: registradas.map(({ producto, movimiento }) => ({
          nombre: producto.nombre,
          cantidad: movimiento.cantidad,
          descripcion: movimiento.motivo || "Carga de stock",
        })),
      };
      setInformesReposicion((actuales) => {
        const siguientes = [informe, ...actuales];
        try {
          globalThis.localStorage?.setItem(claveInformesReposicion, JSON.stringify(siguientes));
        } catch {
          // El registro del backend sigue siendo la fuente del historial de movimientos.
        }
        return siguientes;
      });
      const productoHistorial = registradas[0].producto;
      setProductoSeleccionado(productoHistorial.id);
      setMovimientos(registradas.filter(({ producto }) => producto.id === productoHistorial.id).map(({ movimiento }) => movimiento));
      setCantidadesCarga((actuales) => {
        const siguientes = { ...actuales };
        registradas.forEach(({ producto }) => { delete siguientes[producto.id]; });
        return siguientes;
      });
      setDetallesCarga((actuales) => {
        const siguientes = { ...actuales };
        registradas.forEach(({ producto }) => { delete siguientes[producto.id]; });
        return siguientes;
      });
      setMensaje(`Se registraron ${registradas.length} cargas de stock.`);
    }
    if (fallidas.length) {
      setError(`No se pudieron registrar todas las cargas: ${fallidas.join("; ")}`);
    } else {
      setModoInventario("");
    }
    setGuardandoCargas(false);
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
        <div className="flex flex-wrap gap-2">
          {esAdministrador && <button className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${modoInventario === "minimos" ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-700"}`} disabled={guardandoMinimos || guardandoCargas} onClick={() => { if (modoInventario === "minimos") { setModoInventario(""); setError(""); } else { setModoInventario("minimos"); setError(""); setMinimosEditados(Object.fromEntries(productosInventariables.map((producto) => [producto.id, String(producto.stockMinimo ?? 0)]))); } }} type="button">Editar mínimos</button>}
          <button className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${modoInventario === "carga" ? "border-emerald-800 bg-emerald-800 text-white" : "border-emerald-800 bg-white text-emerald-800"}`} disabled={guardandoMinimos || guardandoCargas} onClick={() => { if (modoInventario === "carga") { setModoInventario(""); setError(""); } else { setModoInventario("carga"); setError(""); setCantidadesCarga({}); setDetallesCarga({}); setClavesCarga({}); } }} type="button">Cargar stock</button>
          {esAdministrador && <button className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!productoActual || modoInventario !== ""} onClick={() => productoActual && abrirMovimiento(productoActual)} type="button">Otros movimientos</button>}
        </div>
      </header>

      {(errorAlmacenamiento || errorCatalogoApi) && (
        <p
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {errorAlmacenamiento || errorCatalogoApi}
        </p>
      )}
      {error && !modalAbierto && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>
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
          {[{ id: "todos", nombre: "Todas" }, ...listarCategoriasProductos()]
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productosFiltrados.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={5}>No hay productos en esta categoría.</td></tr>
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
                      <button className="text-left" onClick={() => { setMovimientos([]); setErrorHistorial(""); setCargandoMovimientos(true); setProductoSeleccionado(producto.id); }} type="button" title="Ver historial de inventario">{producto.nombre}</button>
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
                      {modoInventario === "carga" && <div className="mt-2 grid w-full min-w-44 gap-2">
                        <label className="text-xs font-medium text-slate-600">Cantidad ({producto.esSabor ? "porciones" : "unidades"})
                          <input aria-label={`Cantidad a cargar de ${producto.nombre}`} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" min="1" onChange={(event) => { setCantidadesCarga((actuales) => ({ ...actuales, [producto.id]: event.target.value })); setClavesCarga((actuales) => { const siguientes = { ...actuales }; delete siguientes[producto.id]; return siguientes; }); }} step="1" type="number" value={cantidadesCarga[producto.id] ?? ""} />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Detalle (opcional)
                          <input aria-label={`Detalle de carga de ${producto.nombre}`} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" maxLength="240" onChange={(event) => { setDetallesCarga((actuales) => ({ ...actuales, [producto.id]: event.target.value })); setClavesCarga((actuales) => { const siguientes = { ...actuales }; delete siguientes[producto.id]; return siguientes; }); }} placeholder="Ej.: Reposición proveedor" value={detallesCarga[producto.id] ?? ""} />
                        </label>
                      </div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {modoInventario === "minimos" ? <input aria-label={`Stock mínimo de ${producto.nombre}`} className="w-24 rounded-md border border-slate-300 px-2 py-1.5" min="0" onChange={(event) => setMinimosEditados((actuales) => ({ ...actuales, [producto.id]: event.target.value }))} type="number" value={minimosEditados[producto.id] ?? producto.stockMinimo ?? 0} /> : producto.stockMinimo ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${{ "agotado": "text-red-700", "reponer": "text-red-700", "por-agotarse": "text-amber-800", "sin-conteo": "text-slate-500", "en-stock": "text-emerald-700" }[obtenerEstadoStock(producto)]}`} role="status">
                        {{ "agotado": "Agotado", "reponer": "Reponer", "por-agotarse": "Por agotarse", "en-stock": "En stock", "sin-conteo": "Cargar stock" }[obtenerEstadoStock(producto)]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatearPrecio(producto.precio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modoInventario === "minimos" && (
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" disabled={guardandoMinimos} onClick={() => { setModoInventario(""); setError(""); }} type="button">Cancelar</button>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={guardandoMinimos} onClick={guardarMinimos} type="button">{guardandoMinimos ? "Guardando..." : "Confirmar mínimos"}</button>
        </div>
      )}
      {modoInventario === "carga" && (
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" disabled={guardandoCargas} onClick={() => { setModoInventario(""); setError(""); }} type="button">Cancelar</button>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={guardandoCargas} onClick={guardarCargas} type="button">{guardandoCargas ? "Registrando cargas..." : "Confirmar cargas"}</button>
        </div>
      )}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">Historial de reposición</h2>
        {informesReposicion.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Cada confirmación de carga aparecerá como un informe con sus productos, cantidades y detalles.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {informesReposicion.map((informe) => (
              <li className="py-4" key={informe.id}>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <strong className="text-slate-800">{new Date(informe.fecha).toLocaleString("es-AR")} · {informe.empleado}</strong>
                  <span className="text-slate-500">{informe.productos.length} productos</span>
                </div>
                <ul className="mt-2 space-y-1 pl-4 text-sm text-slate-600">
                  {informe.productos.map((producto, indice) => (
                    <li className="list-disc" key={`${informe.id}-${producto.nombre}-${indice}`}>
                      <span className="font-medium text-slate-800">{producto.nombre}</span> · +{producto.cantidad} · {producto.descripcion}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {productoActual && (
        <section aria-labelledby="historial-heading" className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className="text-lg font-semibold text-slate-900"
                id="historial-heading"
              >
                Historial de inventario: {productoActual.nombre}
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
            <button
              aria-pressed={soloReposiciones}
              className="rounded-md border border-emerald-800 bg-white px-3 py-2 text-sm font-medium text-emerald-800 aria-pressed:bg-emerald-800 aria-pressed:text-white"
              onClick={() => setSoloReposiciones((actual) => !actual)}
              type="button"
            >
              {soloReposiciones ? "Ver todos los movimientos" : "Ver solo reposiciones"}
            </button>
          </div>
          {errorHistorial ? (
            <p
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              role="alert"
            >
              No se pudo cargar el historial: {errorHistorial}
            </p>
          ) : movimientosVisibles.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              {historialCargando
                ? "Cargando movimientos..."
                : soloReposiciones
                  ? "No hay reposiciones registradas para este producto."
                  : "No hay movimientos para este producto."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {movimientosVisibles.map((movimiento) => (
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
