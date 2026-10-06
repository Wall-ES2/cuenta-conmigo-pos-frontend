import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

function RequireAuth({ children }) {
  const inicializando = useAuthStore((state) => state.inicializando)
  const usuario = useAuthStore((state) => state.usuario)
  const location = useLocation()

  if (inicializando) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
        Verificando sesión...
      </main>
    )
  }

  if (!usuario) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return children
}

export default RequireAuth
