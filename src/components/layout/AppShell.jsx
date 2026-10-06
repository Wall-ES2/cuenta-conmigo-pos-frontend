import { useState } from 'react'
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useVentasStore } from '../../modules/ventas/store/useVentasStore'
import { useAuthStore } from '../../stores/useAuthStore'

function AppShell() {
  const { pathname } = useLocation()
  const [sidebarColapsado, setSidebarColapsado] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const esPantallaVentas = pathname === '/ventas'
  const inicializar = useVentasStore((state) => state.inicializar)
  const sincronizarPendientes = useVentasStore((state) => state.sincronizarPendientes)
  const refrescarColaSincronizacion = useVentasStore((state) => state.refrescarColaSincronizacion)
  const cargarCatalogoDesdeApi = useVentasStore((state) => state.cargarCatalogoDesdeApi)
  const usuario = useAuthStore((state) => state.usuario)

  useEffect(() => {
    let activo = true

    inicializar()
      .then(() => {
        if (activo) return cargarCatalogoDesdeApi()
        return undefined
      })
      .then(() => {
        if (activo && navigator.onLine) return sincronizarPendientes()
        return undefined
      })
      .catch((error) => {
        console.error('No se pudo inicializar el almacenamiento o cargar datos del backend.', error)
      })

    const alVolverLaConexion = () => {
      cargarCatalogoDesdeApi().catch((error) => {
        console.error('No se pudo actualizar el catálogo al restablecer la conexión.', error)
      })
      sincronizarPendientes().catch((error) => {
        console.error('No se pudieron sincronizar las ventas pendientes.', error)
      })
    }

    const alRecibirMensajeServiceWorker = (event) => {
      if (event.data?.tipo === 'sincronizacion-ventas-solicitada') {
        sincronizarPendientes().catch((error) => {
          console.error('No se pudieron sincronizar las ventas pendientes.', error)
        })
      }
    }

    window.addEventListener('online', alVolverLaConexion)
    navigator.serviceWorker?.addEventListener('message', alRecibirMensajeServiceWorker)

    return () => {
      activo = false
      window.removeEventListener('online', alVolverLaConexion)
      navigator.serviceWorker?.removeEventListener('message', alRecibirMensajeServiceWorker)
    }
  }, [
    cargarCatalogoDesdeApi,
    inicializar,
    refrescarColaSincronizacion,
    sincronizarPendientes
  ])

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {sidebarVisible && (
        <Sidebar
          colapsado={sidebarColapsado}
          onAlternar={() => setSidebarColapsado((actual) => !actual)}
          rol={usuario?.role}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          esPantallaVentas={esPantallaVentas}
          onAlternarSidebar={() => setSidebarVisible((actual) => !actual)}
          sidebarVisible={sidebarVisible}
        />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell