import { NavLink } from 'react-router-dom'

const links = [
  { nombre: 'Inicio', ruta: '/inicio', iniciales: 'IN' },
  { nombre: 'Ventas', ruta: '/ventas', iniciales: 'VE' },
  { nombre: 'Inventario', ruta: '/inventario', iniciales: 'IV' },
  { nombre: 'Financiero', ruta: '/financiero', iniciales: 'FI' },
  { nombre: 'Administración', ruta: '/administracion', iniciales: 'AD' }
]

function Sidebar({ colapsado, onAlternar, rol }) {
  const linksVisibles = links.filter((link) => (
    !['/administracion', '/financiero'].includes(link.ruta) || rol === 'Administrador'
  ))

  return (
    <aside
      aria-label="Navegación principal"
      className={`min-h-screen shrink-0 bg-slate-950 p-3 text-white transition-[width] duration-200 ${
        colapsado ? 'w-20' : 'w-20 md:w-64'
      }`}
    >
      <div className={`mb-8 flex items-start justify-between gap-2 ${colapsado ? 'flex-col' : ''}`}>
        {!colapsado && (
          <>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold tracking-tight">Cuenta Conmigo</h1>
              <p className="mt-1 text-sm text-slate-400">Sistema POS</p>
            </div>
            <span aria-hidden="true" className="grid h-10 w-10 place-items-center font-bold md:hidden">
              CC
            </span>
          </>
        )}
        <button
          aria-label={colapsado ? 'Expandir navegación' : 'Colapsar navegación'}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-700 text-sm text-slate-200 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          onClick={onAlternar}
          type="button"
        >
          {colapsado ? '>>' : '<<'}
        </button>
      </div>

      <nav aria-label="Secciones" className="space-y-2">
        {linksVisibles.map((link) => (
          <NavLink
            aria-label={colapsado ? link.nombre : undefined}
            key={link.ruta}
            title={colapsado ? link.nombre : undefined}
            to={link.ruta}
            className={({ isActive }) =>
              `flex min-h-11 items-center rounded-lg text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                colapsado ? 'justify-center px-2' : 'justify-center px-2 md:justify-start md:px-4'
              } ${
                isActive ? 'bg-emerald-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {colapsado ? (
              link.iniciales
            ) : (
              <>
                <span className="md:hidden">{link.iniciales}</span>
                <span className="hidden md:inline">{link.nombre}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar