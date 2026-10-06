import { Link } from 'react-router-dom'

function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold text-slate-900">Acceso no autorizado</h1>
      <p className="mt-2 text-slate-600">Tu rol no tiene permiso para ver esta sección.</p>
      <Link className="mt-5 inline-block font-semibold text-emerald-800 underline" to="/inicio">
        Volver al inicio
      </Link>
    </main>
  )
}

export default UnauthorizedPage
