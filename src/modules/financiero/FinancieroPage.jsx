import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TendenciaVentas from "./components/TendenciaVentas";
import TarjetaIndicador from "./components/TarjetaIndicador";
import { formatearPrecio } from "../ventas/data/productos.js";
import {
  calcularReporteVentas,
  cargarVentasLocales,
  PERIODOS_REPORTE,
} from "./services/reportesVentas.js";

const categoriaEtiquetas = {
  helados: "Helados",
  licuados: "Licuados",
  infusiones: "Infusiones",
  bebidas: "Bebidas",
  cafeteria: "Cafetería",
  panaderia: "Panadería",
  otros: "Otros",
};

function FinancieroPage() {
  const [periodo, setPeriodo] = useState("sieteDias");
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    cargarVentasLocales()
      .then((ventas) => {
        if (activo) {
          const resumen = calcularReporteVentas(
            ventas,
            new Date(),
            PERIODOS_REPORTE[periodo].dias,
          );
          setReporte(resumen);
          setError("");
        }
      })
      .catch((loadError) => {
        if (activo) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los datos financieros locales.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [periodo]);

  return (
    <section className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            Reportes de gerencia
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Financiero
          </h1>
          <p className="mt-2 text-slate-600">
            Indicadores calculados a partir de las ventas guardadas en este
            dispositivo.
          </p>
        </div>
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="periodo-reporte"
        >
          Período
          <select
            className="mt-1.5 block rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            id="periodo-reporte"
            onChange={(event) => {
              setCargando(true);
              setReporte(null);
              setPeriodo(event.target.value);
            }}
            value={periodo}
          >
            {Object.entries(PERIODOS_REPORTE).map(([id, opcion]) => (
              <option key={id} value={id}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </header>

      <p className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Los reportes reflejan el historial local de este dispositivo. No
        consolidan ventas de otras cajas o sucursales.
      </p>

      {error && (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          No se pudo preparar el reporte: {error}
        </p>
      )}

      {cargando && !reporte ? (
        <p className="mt-8 text-sm text-slate-600" role="status">
          Cargando ventas...
        </p>
      ) : (
        reporte && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <TarjetaIndicador
                detalle={PERIODOS_REPORTE[periodo].etiqueta}
                etiqueta="Total vendido"
                valor={formatearPrecio(reporte.totalFacturado)}
              />
              <TarjetaIndicador
                etiqueta="Ventas registradas"
                valor={reporte.cantidadVentas.toLocaleString("es-CL")}
              />
              <TarjetaIndicador
                etiqueta="Unidades vendidas"
                valor={reporte.unidadesVendidas.toLocaleString("es-CL")}
              />
              <TarjetaIndicador
                etiqueta="Promedio por venta"
                valor={formatearPrecio(reporte.promedioPorVenta)}
              />
              <TarjetaIndicador
                detalle={formatearPrecio(reporte.montoPendiente)}
                etiqueta="Ventas pendientes de sincronizar"
                valor={reporte.ventasPendientes.toLocaleString("es-CL")}
              />
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
              <section
                aria-labelledby="tendencia-heading"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2
                  className="text-lg font-semibold text-slate-900"
                  id="tendencia-heading"
                >
                  Tendencia diaria
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Importe vendido por día en el período elegido.
                </p>
                <TendenciaVentas dias={reporte.dias} />
              </section>

              <section
                aria-labelledby="pagos-heading"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2
                  className="text-lg font-semibold text-slate-900"
                  id="pagos-heading"
                >
                  Ventas por medio de pago
                </h2>
                {reporte.porMetodo.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Sin ventas en el período.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {reporte.porMetodo.map((item) => {
                      const porcentaje =
                        reporte.totalFacturado > 0
                          ? (item.total / reporte.totalFacturado) * 100
                          : 0;

                      return (
                        <li className="py-3 text-sm" key={item.nombre}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-700">
                              {item.nombre} · {item.cantidad} ventas
                            </span>
                            <span className="font-semibold text-slate-900">
                              {formatearPrecio(item.total)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {porcentaje.toFixed(1)}% de la venta total
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section
                aria-labelledby="categorias-heading"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2
                  className="text-lg font-semibold text-slate-900"
                  id="categorias-heading"
                >
                  Ventas por categoría
                </h2>
                {reporte.porCategoria.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Sin productos vendidos en el período.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {reporte.porCategoria.map((item) => {
                      const porcentaje =
                        reporte.totalFacturado > 0
                          ? (item.total / reporte.totalFacturado) * 100
                          : 0;

                      return (
                        <li key={item.nombre}>
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="text-slate-700">
                              {categoriaEtiquetas[item.nombre] ?? item.nombre}
                            </span>
                            <span className="text-right">
                              <strong className="block font-semibold text-slate-900">
                                {formatearPrecio(item.total)}
                              </strong>
                              <span className="text-xs text-slate-500">
                                {item.cantidad} unidades ·{" "}
                                {porcentaje.toFixed(1)}%
                              </span>
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              aria-label={`${Math.round(porcentaje)} por ciento`}
                              className="h-full rounded-full bg-emerald-700"
                              role="img"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section
                aria-labelledby="productos-heading"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2
                  className="text-lg font-semibold text-slate-900"
                  id="productos-heading"
                >
                  Productos más vendidos
                </h2>
                {reporte.productosMasVendidos.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    Sin productos vendidos en el período.
                  </p>
                ) : (
                  <ol className="mt-4 divide-y divide-slate-100">
                    {reporte.productosMasVendidos.map((item, indice) => (
                      <li
                        className="flex items-center justify-between gap-3 py-3 text-sm"
                        key={item.nombre}
                      >
                        <span className="text-slate-700">
                          {indice + 1}. {item.nombre} · {item.cantidad} unidades
                        </span>
                        <span className="shrink-0 font-semibold text-slate-900">
                          {formatearPrecio(item.total)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <section
              aria-labelledby="recientes-heading"
              className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    className="text-lg font-semibold text-slate-900"
                    id="recientes-heading"
                  >
                    Ventas recientes
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Hasta ocho operaciones del período seleccionado.
                  </p>
                </div>
                <Link
                  className="text-sm font-semibold text-emerald-800 underline"
                  to="/ventas"
                >
                  Ir a ventas
                </Link>
              </div>
              {reporte.ventasRecientes.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Sin ventas registradas en el período.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {reporte.ventasRecientes.map((venta) => (
                    <li className="py-2" key={venta.id}>
                      <details className="group rounded-lg">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-700">
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-800">
                              {new Date(venta.creadaEn).toLocaleString("es-CL")}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {venta.metodoPago || "Sin especificar"} ·{" "}
                              {venta.estado === "sincronizada"
                                ? "Sincronizada"
                                : "Pendiente"}{" "}
                              ·{" "}
                              {venta.items.reduce(
                                (total, item) => total + item.cantidad,
                                0,
                              )}{" "}
                              unidades
                            </span>
                          </span>
                          <span className="ml-auto flex items-center gap-3">
                            <strong className="text-slate-900">
                              {formatearPrecio(venta.total)}
                            </strong>
                            <span className="text-xs font-semibold text-emerald-800 group-open:hidden">
                              Ver detalle
                            </span>
                            <span className="hidden text-xs font-semibold text-emerald-800 group-open:inline">
                              Ocultar detalle
                            </span>
                          </span>
                        </summary>
                        <div className="mx-3 mb-3 rounded-lg bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Productos de la venta
                          </p>
                          <ul className="divide-y divide-slate-200">
                            {venta.items.map((item, indice) => (
                              <li
                                className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-sm"
                                key={`${venta.id}-${item.productoId ?? item.nombre}-${indice}`}
                              >
                                <span className="text-slate-700">
                                  {item.nombre} · {item.cantidad} ×{" "}
                                  {formatearPrecio(
                                    item.precioUnitario ??
                                      item.totalLinea / item.cantidad,
                                  )}
                                </span>
                                <strong className="text-slate-900">
                                  {formatearPrecio(item.totalLinea)}
                                </strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )
      )}
    </section>
  );
}

export default FinancieroPage;
