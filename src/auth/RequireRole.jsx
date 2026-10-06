import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

function RequireRole({ allowedRoles, children }) {
  const usuario = useAuthStore((state) => state.usuario)

  if (!usuario || !allowedRoles.includes(usuario.role)) {
    return <Navigate replace to="/no-autorizado" />
  }

  return children
}

export default RequireRole
