import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

function InicioPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const esAdministrador = usuario?.role === 'Administrador'
  const accesos = [
    {
      ruta: '/ventas',
      titulo: 'Punto de venta',
      descripcion: 'Inicia una venta y prepara el pedido.',
      accion: 'Ir a ventas'
    },
    {
      ruta: '/inventario',
      titulo: 'Inventario',
      descripcion: 'Consulta y administra las existencias.',
      accion: 'Ver inventario'
    },
    ...(esAdministrador
      ? [
          {
            ruta: '/financiero',
            titulo: 'Financiero',
            descripcion: 'Revisa los reportes e indicadores del negocio.',
            accion: 'Ver reportes'
          },
          {
            ruta: '/administracion',
            titulo: 'Administración',
            descripcion: 'Gestiona productos y cuentas de usuario.',
            accion: 'Administrar'
          }
        ]
      : [])
  ]

  return (
    <section className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-10 md:px-10 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            Cuenta Conmigo POS
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Bienvenido{usuario?.name ? `, ${usuario.name}` : ''}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Nos alegra tenerte aquí. Desde este espacio puedes acceder a las herramientas de tu jornada.
          </p>
          {usuario?.role && (
            <span className="mt-5 inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-medium text-emerald-900">
              {usuario.role}
            </span>
          )}
        </div>

        <div className="p-6 md:p-10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Accesos rápidos</h2>
            <p className="mt-1 text-sm text-slate-600">Selecciona una sección para continuar.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {accesos.map((acceso) => (
              <Link
                className="group rounded-xl border border-slate-200 p-5 transition hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                key={acceso.ruta}
                to={acceso.ruta}
              >
                <h3 className="font-semibold text-slate-900">{acceso.titulo}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{acceso.descripcion}</p>
                <span className="mt-5 inline-block text-sm font-semibold text-emerald-800 group-hover:underline">
                  {acceso.accion}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default InicioPage
