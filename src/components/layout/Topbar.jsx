import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVentasStore } from "../../modules/ventas/store/useVentasStore";
import { useAuthStore } from "../../stores/useAuthStore";

function Topbar({ esPantallaVentas, sidebarVisible, onAlternarSidebar }) {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  const cantidadPendiente = useVentasStore((state) => state.cantidadPendiente);
  const estadoSincronizacion = useVentasStore(
    (state) => state.estadoSincronizacion,
  );
  const errorAlmacenamiento = useVentasStore(
    (state) => state.errorAlmacenamiento,
  );
  const errorServiceWorker = useVentasStore(
    (state) => state.errorServiceWorker,
  );
  const errorSincronizacion = useVentasStore(
    (state) => state.errorSincronizacion,
  );
  const errorCatalogoApi = useVentasStore((state) => state.errorCatalogoApi);
  const usuario = useAuthStore((state) => state.usuario);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  async function salir() {
    try {
      await logout();
    } catch {
      // El store conserva el mensaje para mostrarlo en el formulario de acceso.
    } finally {
      navigate("/login", { replace: true });
    }
  }

  useEffect(() => {
    const actualizarEstado = () => setEnLinea(navigator.onLine);

    window.addEventListener("online", actualizarEstado);
    window.addEventListener("offline", actualizarEstado);

    return () => {
      window.removeEventListener("online", actualizarEstado);
      window.removeEventListener("offline", actualizarEstado);
    };
  }, []);

  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        {esPantallaVentas ? (
          <Link
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            to="/inicio"
          >
            Volver al panel
          </Link>
        ) : (
          <h2 className="font-semibold text-slate-800">Panel de control</h2>
        )}
        <button
          aria-expanded={sidebarVisible}
          aria-label={
            sidebarVisible ? "Ocultar barra lateral" : "Mostrar barra lateral"
          }
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          onClick={onAlternarSidebar}
          type="button"
        >
          {sidebarVisible ? "Ocultar barra" : "Mostrar barra"}
        </button>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <div aria-live="polite" className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${enLinea ? "bg-emerald-500" : "bg-amber-500"}`}
          />
          <span className="text-sm text-slate-600">
            {enLinea ? "Con conexión" : "Sin conexión"}
          </span>
        </div>
        {errorAlmacenamiento ? (
          <span className="text-sm font-semibold text-red-700" role="alert">
            Almacenamiento local no disponible
          </span>
        ) : errorServiceWorker ? (
          <span className="text-sm font-semibold text-amber-700" role="alert">
            Modo offline limitado
          </span>
        ) : estadoSincronizacion === "requiere-intervencion" ? (
          <Link
            className="text-sm font-semibold text-red-700 underline decoration-red-300 underline-offset-2"
            to="/ventas"
          >
            Revisar stock de venta pendiente
          </Link>
        ) : cantidadPendiente > 0 ? (
          <span aria-live="polite" className="text-sm text-amber-700">
            {cantidadPendiente}{" "}
            {cantidadPendiente === 1 ? "venta pendiente" : "ventas pendientes"}
            {estadoSincronizacion === "error"
              ? " · Error de sincronización"
              : ""}
          </span>
        ) : estadoSincronizacion === "sincronizada" ? (
          <span aria-live="polite" className="text-sm text-emerald-700">
            Ventas sincronizadas
          </span>
        ) : null}
        <span className="hidden text-sm font-medium text-slate-700 sm:inline">
          {usuario?.name ?? usuario?.email ?? usuario?.role}
        </span>
        <button
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={salir}
          type="button"
        >
          Cerrar sesión
        </button>
      </div>
      {errorSincronizacion && (
        <span className="sr-only" role="alert">
          {errorSincronizacion}
        </span>
      )}
      {errorCatalogoApi && (
        <span className="sr-only" role="alert">
          {errorCatalogoApi}
        </span>
      )}
    </header>
  );
}

export default Topbar;
