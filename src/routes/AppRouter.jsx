import { useEffect } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'

import AppShell from '../components/layout/AppShell'
import RequireAuth from '../auth/RequireAuth'
import RequireRole from '../auth/RequireRole'
import AdministracionPage from '../modules/administracion/AdministracionPage'
import FinancieroPage from '../modules/financiero/FinancieroPage'
import InicioPage from '../modules/inicio/InicioPage'
import InventarioPage from '../modules/inventario/InventarioPage'
import VentasPage from '../modules/ventas/VentasPage'
import LoginPage from '../pages/LoginPage'
import UnauthorizedPage from '../pages/UnauthorizedPage'
import { useAuthStore } from '../stores/useAuthStore'

const router = createBrowserRouter([
  ...(import.meta.env.DEV
    ? [{
        path: '/preview',
        lazy: async () => {
          const module = await import('../pages/PreviewPage.jsx')
          return {
            Component: module.default,
            HydrateFallback: () => (
              <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
                Cargando vista previa...
              </main>
            )
          }
        }
      }]
    : []),
  { path: '/login', element: <LoginPage /> },
  { path: '/no-autorizado', element: <UnauthorizedPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: '/inicio', element: <InicioPage /> },
      { path: '/ventas', element: <VentasPage /> },
      { path: '/inventario', element: <InventarioPage /> },
      {
        path: '/financiero',
        element: (
          <RequireRole allowedRoles={['Administrador']}>
            <FinancieroPage />
          </RequireRole>
        )
      },
      {
        path: '/administracion',
        element: (
          <RequireRole allowedRoles={['Administrador']}>
            <AdministracionPage />
          </RequireRole>
        )
      }
    ]
  },
  {
    path: '/',
    element: <Navigate replace to="/inicio" />
  },
  { path: '*', element: <Navigate replace to="/inicio" /> }
], {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
})

function AppRouter() {
  const inicializarSesion = useAuthStore((state) => state.inicializar)

  useEffect(() => {
    inicializarSesion()
  }, [inicializarSesion])

  return <RouterProvider router={router} />
}

export default AppRouter
