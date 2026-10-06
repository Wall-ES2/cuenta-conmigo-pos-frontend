import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const usuario = useAuthStore((state) => state.usuario)
  const inicializando = useAuthStore((state) => state.inicializando)
  const procesando = useAuthStore((state) => state.procesando)
  const error = useAuthStore((state) => state.error)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const location = useLocation()

  if (inicializando) {
    return <main className="grid min-h-screen place-items-center">Verificando sesión...</main>
  }

  if (usuario) return <Navigate replace to="/inicio" />

  async function enviarFormulario(event) {
    event.preventDefault()

    try {
      await login(email.trim(), password)
      navigate(location.state?.from?.pathname ?? '/inicio', { replace: true })
    } catch {
      // El error ya está expuesto por el store para el formulario.
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Cuenta Conmigo
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ingresa con tu cuenta para acceder al punto de venta.
        </p>

        <form className="mt-6 space-y-4" onSubmit={enviarFormulario}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="login-email">
            Correo electrónico
            <input
              autoComplete="username"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700" htmlFor="login-password">
            Contraseña
            <input
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              id="login-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}

          <button
            className="w-full rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
            disabled={procesando}
            type="submit"
          >
            {procesando ? 'Validando...' : 'Ingresar'}
          </button>
        </form>

        <Link
          className="mt-3 block w-full rounded-lg border border-emerald-800 px-4 py-3 text-center text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
          to="/preview"
        >
          Ver demo
        </Link>
      </section>
    </main>
  )
}

export default LoginPage
