import { useEffect, useMemo, useState } from 'react'
import { categorias, formatearPrecio } from '../modules/ventas/data/productos.js'
import CarritoVentas from '../modules/ventas/components/CarritoVentas.jsx'
import ProductoCard from '../modules/ventas/components/ProductoCard.jsx'
import TendenciaVentas from '../modules/financiero/components/TendenciaVentas.jsx'
import TarjetaIndicador from '../modules/financiero/components/TarjetaIndicador.jsx'
import { calcularReporteVentas } from '../modules/financiero/services/reportesVentas.js'
import './preview.css'
import '../modules/ventas/ventas.css'

const navegacion = [
  { id: 'inicio', nombre: 'Inicio', iniciales: 'IN' },
  { id: 'ventas', nombre: 'Ventas', iniciales: 'VE' },
  { id: 'inventario', nombre: 'Inventario', iniciales: 'IV' },
  { id: 'financiero', nombre: 'Financiero', iniciales: 'FI' },
  { id: 'administracion', nombre: 'Administración', iniciales: 'AD' }
]

const productosDemo = [
  { id: 'demo-helado-vainilla', nombre: 'Helado de vainilla', categoria: 'helados', precio: 1800, detalle: 'Vaso mediano', imagenUrl: '' },
  { id: 'demo-helado-chocolate', nombre: 'Helado de chocolate', categoria: 'helados', precio: 1900, detalle: 'Vaso mediano', imagenUrl: '' },
  { id: 'demo-cucurucho', nombre: 'Cucurucho doble', categoria: 'helados', precio: 2500, detalle: 'Dos sabores', imagenUrl: '' },
  { id: 'demo-cafe', nombre: 'Café latte', categoria: 'cafeteria', precio: 2200, detalle: 'Tamaño regular', imagenUrl: '' },
  { id: 'demo-capuccino', nombre: 'Capuccino', categoria: 'cafeteria', precio: 2400, detalle: 'Tamaño regular', imagenUrl: '' },
  { id: 'demo-croissant', nombre: 'Croissant', categoria: 'panaderia', precio: 1600, detalle: 'Recién horneado', imagenUrl: '' },
  { id: 'demo-medialuna', nombre: 'Medialuna', categoria: 'panaderia', precio: 900, detalle: 'Unidad', imagenUrl: '' },
  { id: 'demo-agua', nombre: 'Agua mineral', categoria: 'otros', precio: 1200, detalle: 'Botella 500 ml', imagenUrl: '' }
]

const usuariosDemoIniciales = [
  { id: 'demo-admin', nombre: 'María González', email: 'maria@demo.local', rol: 'Administrador' },
  { id: 'demo-cajero', nombre: 'Juan Pérez', email: 'juan@demo.local', rol: 'Cajero' }
]

const formularioProductoDemoVacio = {
  nombre: '',
  categoria: 'helados',
  precio: '',
  detalle: '',
  imagenUrl: ''
}

const categoriaNombre = Object.fromEntries(categorias.map(({ id, nombre }) => [id, nombre]))

function crearVentasDemo() {
  const hoy = new Date()
  const fecha = (diasAtras, hora) => {
    const valor = new Date(hoy)
    valor.setDate(valor.getDate() - diasAtras)
    valor.setHours(hora, 30, 0, 0)
    return valor.toISOString()
  }

  return [
    ventaDemo('demo-venta-1', fecha(0, 10), 'Tarjeta', [
      { nombre: 'Café latte', categoria: 'cafeteria', cantidad: 2, totalLinea: 4400 },
      { nombre: 'Croissant', categoria: 'panaderia', cantidad: 1, totalLinea: 1600 }
    ]),
    ventaDemo('demo-venta-2', fecha(0, 12), 'Efectivo', [
      { nombre: 'Helado de vainilla', categoria: 'helados', cantidad: 2, totalLinea: 3600 }
    ], 'pendiente'),
    ventaDemo('demo-venta-3', fecha(1, 11), 'Efectivo', [
      { nombre: 'Capuccino', categoria: 'cafeteria', cantidad: 1, totalLinea: 2400 },
      { nombre: 'Medialuna', categoria: 'panaderia', cantidad: 2, totalLinea: 1800 }
    ]),
    ventaDemo('demo-venta-4', fecha(2, 14), 'Transferencia', [
      { nombre: 'Cucurucho doble', categoria: 'helados', cantidad: 2, totalLinea: 5000 }
    ]),
    ventaDemo('demo-venta-5', fecha(4, 16), 'Tarjeta', [
      { nombre: 'Helado de chocolate', categoria: 'helados', cantidad: 2, totalLinea: 3800 },
      { nombre: 'Agua mineral', categoria: 'otros', cantidad: 1, totalLinea: 1200 }
    ]),
    ventaDemo('demo-venta-6', fecha(6, 13), 'Efectivo', [
      { nombre: 'Café latte', categoria: 'cafeteria', cantidad: 1, totalLinea: 2200 },
      { nombre: 'Croissant', categoria: 'panaderia', cantidad: 1, totalLinea: 1600 }
    ])
  ]
}

function ventaDemo(id, creadaEn, metodoPago, items, estado = 'sincronizada') {
  return {
    id,
    creadaEn,
    metodoPago,
    estado,
    items,
    total: items.reduce((total, item) => total + item.totalLinea, 0)
  }
}

function PreviewPage() {
  const [seccion, setSeccion] = useState('inicio')
  const [rolActivo, setRolActivo] = useState('Administrador')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [sidebarColapsado, setSidebarColapsado] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([])
  const [ventas, setVentas] = useState(crearVentasDemo)
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [mostrarCobro, setMostrarCobro] = useState(false)
  const [aviso, setAviso] = useState('')
  const [productos, setProductos] = useState(productosDemo)
  const [usuariosDemo, setUsuariosDemo] = useState(usuariosDemoIniciales)
  const [periodo, setPeriodo] = useState(7)
  const navegacionVisible = rolActivo === 'Administrador'
    ? navegacion
    : navegacion.filter(({ id }) => ['inicio', 'ventas', 'inventario'].includes(id))
  const subtotal = carrito.reduce((total, item) => total + item.precio * item.cantidad, 0)

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es')
    return productos.filter((producto) => (
      (categoriaActiva === 'todos' || producto.categoria === categoriaActiva)
      && producto.nombre.toLocaleLowerCase('es').includes(termino)
    ))
  }, [busqueda, categoriaActiva, productos])

  const reporte = useMemo(
    () => calcularReporteVentas(ventas, new Date(), periodo),
    [periodo, ventas]
  )

  function agregarAlCarrito(producto) {
    setCarrito((actual) => {
      const existe = actual.find((item) => item.id === producto.id)
      return existe
        ? actual.map((item) => item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item)
        : [...actual, { ...producto, cantidad: 1 }]
    })
  }

  function actualizarCantidad(id, incremento) {
    setCarrito((actual) => actual
      .map((item) => item.id === id ? { ...item, cantidad: item.cantidad + incremento } : item)
      .filter((item) => item.cantidad > 0))
  }

  function confirmarVenta() {
    const items = carrito.map((item) => ({
      nombre: item.nombre,
      categoria: item.categoria,
      cantidad: item.cantidad,
      totalLinea: item.precio * item.cantidad
    }))
    setVentas((actuales) => [
      ventaDemo(`demo-${globalThis.crypto.randomUUID()}`, new Date().toISOString(), metodoPago, items, 'pendiente'),
      ...actuales
    ])
    setCarrito([])
    setMostrarCobro(false)
    setAviso('Venta demostrativa registrada. No se guardó en el sistema.')
  }

  function cambiarRolDemo(rol) {
    setRolActivo(rol)
    setAviso('')
    if (rol === 'Cajero' && ['financiero', 'administracion'].includes(seccion)) {
      setSeccion('inicio')
    }
  }

  return (
    <div className="preview-app">
      {sidebarVisible && (
        <aside className={`preview-sidebar ${sidebarColapsado ? 'preview-sidebar-collapsed' : ''}`}>
          <div className="preview-brand">
            {!sidebarColapsado && (
              <div className="preview-brand-copy">
                <strong>Cuenta Conmigo</strong>
                <span>Sistema POS</span>
              </div>
            )}
            <button
              aria-label={sidebarColapsado ? 'Expandir navegación' : 'Colapsar navegación'}
              className="preview-collapse-button"
              onClick={() => setSidebarColapsado((actual) => !actual)}
              type="button"
            >
              {sidebarColapsado ? '>>' : '<<'}
            </button>
          </div>
          <nav aria-label="Secciones de demostración" className="preview-navigation">
            {navegacionVisible.map((item) => (
              <button
                aria-current={seccion === item.id ? 'page' : undefined}
                aria-label={item.nombre}
                className={`preview-nav-link ${seccion === item.id ? 'preview-nav-active' : ''}`}
                key={item.id}
                onClick={() => {
                  setSeccion(item.id)
                  setAviso('')
                }}
                title={sidebarColapsado ? item.nombre : undefined}
                type="button"
              >
                {sidebarColapsado ? (
                  item.iniciales
                ) : (
                  <>
                    <span className="preview-nav-name">{item.nombre}</span>
                    <span aria-hidden="true" className="preview-nav-initials">{item.iniciales}</span>
                  </>
                )}
              </button>
            ))}
          </nav>
          <div className="preview-sidebar-footer">
            <span>Modo demostración</span>
            <strong>{rolActivo}</strong>
          </div>
        </aside>
      )}

      <div className="preview-main">
        <header className="preview-topbar">
          <div className="preview-topbar-actions">
            <button
              className="preview-secondary-button"
              onClick={() => setSidebarVisible((actual) => !actual)}
              type="button"
            >
              {sidebarVisible ? 'Ocultar barra' : 'Mostrar barra'}
            </button>
            <span className="preview-online-status">
              <span aria-hidden="true" />
              Con conexión
            </span>
          </div>
          <div className="preview-user-controls">
            <label htmlFor="demo-role">Vista de prueba</label>
            <select
              aria-label="Cambiar rol de demostración"
              id="demo-role"
              onChange={(event) => cambiarRolDemo(event.target.value)}
              value={rolActivo}
            >
              <option value="Administrador">Administrador</option>
              <option value="Cajero">Cajero</option>
            </select>
          </div>
        </header>

        <div className="preview-content">
          <div className="preview-disclaimer" role="status">
            <strong>Vista previa demostrativa.</strong>
            <span>Datos ficticios; las acciones no modifican ventas, catálogo, ni backend.</span>
          </div>
          {aviso && <p className="preview-action-notice" role="status">{aviso}</p>}

          {seccion === 'inicio' && (
            <InicioDemo rolActivo={rolActivo} seleccionarSeccion={setSeccion} />
          )}
          {seccion === 'ventas' && (
            <section className="sales-page">
              <header className="sales-header">
                <div>
                  <h1>Ventas</h1>
                  <p>Selecciona productos y prepara el pedido.</p>
                </div>
                <span className="sales-day-label">Punto de venta de prueba</span>
              </header>
              <div className="sales-layout">
                <section aria-label="Catálogo de productos" className="sales-catalog">
                  <div className="sales-toolbar">
                    <div>
                      <h2>Productos</h2>
                      <p>Selecciona un producto para agregar a la venta.</p>
                    </div>
                    <input
                      aria-label="Buscar productos"
                      className="sales-search"
                      onChange={(event) => setBusqueda(event.target.value)}
                      placeholder="Buscar producto..."
                      type="search"
                      value={busqueda}
                    />
                  </div>
                  <div aria-label="Filtrar por categoría" className="sales-categories">
                    {categorias.map((categoria) => (
                      <button
                        aria-pressed={categoriaActiva === categoria.id}
                        className="sales-category-button"
                        key={categoria.id}
                        onClick={() => setCategoriaActiva(categoria.id)}
                        type="button"
                      >
                        {categoria.nombre}
                      </button>
                    ))}
                  </div>
                  <div className="sales-product-grid">
                    {productosFiltrados.length ? productosFiltrados.map((producto) => (
                      <ProductoCard
                        key={producto.id}
                        onAgregar={agregarAlCarrito}
                        producto={producto}
                      />
                    )) : (
                      <div className="sales-no-results">No se encontraron productos.</div>
                    )}
                  </div>
                </section>
                <CarritoVentas
                  items={carrito}
                  onAumentar={(id) => actualizarCantidad(id, 1)}
                  onCobrar={() => setMostrarCobro(true)}
                  onDisminuir={(id) => actualizarCantidad(id, -1)}
                  onQuitar={(id) => setCarrito((actual) => actual.filter((item) => item.id !== id))}
                  onVaciar={() => setCarrito([])}
                  notaVenta="La operación de demostración no se guarda."
                  subtotal={subtotal}
                />
              </div>
            </section>
          )}
          {seccion === 'inventario' && <InventarioDemo />}
          {seccion === 'financiero' && (
            <FinancieroDemo
              periodo={periodo}
              reporte={reporte}
              seleccionarPeriodo={setPeriodo}
            />
          )}
          {seccion === 'administracion' && (
            <AdministracionDemo
              productos={productos}
              setProductos={setProductos}
              usuarios={usuariosDemo}
              setUsuarios={setUsuariosDemo}
            />
          )}
        </div>
      </div>

      {mostrarCobro && (
        <div className="sales-modal-backdrop" role="presentation">
          <section aria-labelledby="preview-payment-title" aria-modal="true" className="sales-modal" role="dialog">
            <h2 id="preview-payment-title">Confirmar venta demostrativa</h2>
            <p>Esta operación solo actualiza la vista previa temporal.</p>
            <div aria-label="Medio de pago" className="sales-payment-methods">
              {['Efectivo', 'Tarjeta', 'Transferencia'].map((medio) => (
                <button
                  aria-pressed={metodoPago === medio}
                  className="sales-payment-method"
                  key={medio}
                  onClick={() => setMetodoPago(medio)}
                  type="button"
                >
                  {medio}
                </button>
              ))}
            </div>
            <div className="sales-modal-total">
              <span>Total</span>
              <strong>{formatearPrecio(subtotal)}</strong>
            </div>
            <div className="sales-modal-actions">
              <button className="sales-modal-cancel" onClick={() => setMostrarCobro(false)} type="button">
                Cancelar
              </button>
              <button className="sales-modal-confirm" onClick={confirmarVenta} type="button">
                Confirmar demo
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function InicioDemo({ rolActivo, seleccionarSeccion }) {
  const accesos = [
    { id: 'ventas', titulo: 'Punto de venta', descripcion: 'Inicia una venta y prepara el pedido.', accion: 'Ir a ventas' },
    { id: 'inventario', titulo: 'Inventario', descripcion: 'Consulta y administra las existencias.', accion: 'Ver inventario' },
    { id: 'financiero', titulo: 'Financiero', descripcion: 'Revisa los reportes e indicadores del negocio.', accion: 'Ver reportes' },
    { id: 'administracion', titulo: 'Administración', descripcion: 'Gestiona productos y cuentas de usuario.', accion: 'Administrar' }
  ].filter(({ id }) => (
    rolActivo === 'Administrador' || ['ventas', 'inventario'].includes(id)
  ))

  return (
    <section className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-10 md:px-10 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Cuenta Conmigo POS</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Bienvenido, María González
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Nos alegra tenerte aquí. Desde este espacio puedes acceder a las herramientas de tu jornada.
          </p>
          <span className="mt-5 inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-medium text-emerald-900">
            {rolActivo}
          </span>
        </div>
        <div className="p-6 md:p-10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Accesos rápidos</h2>
            <p className="mt-1 text-sm text-slate-600">Selecciona una sección para continuar.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {accesos.map((acceso) => (
              <button
                className="group rounded-xl border border-slate-200 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                key={acceso.id}
                onClick={() => seleccionarSeccion(acceso.id)}
                type="button"
              >
                <span className="block font-semibold text-slate-900">{acceso.titulo}</span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">{acceso.descripcion}</span>
                <span className="mt-5 inline-block text-sm font-semibold text-emerald-800 group-hover:underline">
                  {acceso.accion}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ResumenIndicadores({ periodo, reporte }) {
  const etiquetaPeriodo = periodo === 1
    ? 'Hoy'
    : `Últimos ${periodo} días`

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <TarjetaIndicador etiqueta={`Total vendido (${etiquetaPeriodo})`} valor={formatearPrecio(reporte.totalFacturado)} />
      <TarjetaIndicador etiqueta="Ventas registradas" valor={String(reporte.cantidadVentas)} />
      <TarjetaIndicador etiqueta="Unidades vendidas" valor={String(reporte.unidadesVendidas)} />
      <TarjetaIndicador etiqueta="Promedio por venta" valor={formatearPrecio(reporte.promedioPorVenta)} />
      <TarjetaIndicador
        detalle={formatearPrecio(reporte.montoPendiente)}
        etiqueta="Pendientes de sincronizar"
        valor={String(reporte.ventasPendientes)}
      />
    </div>
  )
}

function FinancieroDemo({ periodo, reporte, seleccionarPeriodo }) {
  return (
    <section className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Reportes de gerencia</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Financiero</h1>
          <p className="mt-2 text-slate-600">Indicadores de ejemplo para recorrer el tablero.</p>
        </div>
        <label className="text-sm font-medium text-slate-700" htmlFor="demo-periodo">
          Período
          <select
            className="mt-1.5 block rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            id="demo-periodo"
            onChange={(event) => seleccionarPeriodo(Number(event.target.value))}
            value={periodo}
          >
            <option value={1}>Hoy</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
        </label>
      </header>
      <ResumenIndicadores periodo={periodo} reporte={reporte} />
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Tendencia diaria</h2>
          <TendenciaVentas dias={reporte.dias} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Ventas por medio de pago</h2>
          <ListaAgrupacion
            cantidadEtiqueta="ventas"
            elementos={reporte.porMetodo}
            totalPeriodo={reporte.totalFacturado}
          />
        </section>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Ventas por categoría</h2>
          <ListaAgrupacion
            elementos={reporte.porCategoria.map((item) => ({
              ...item,
              nombre: categoriaNombre[item.nombre] ?? item.nombre
            }))}
            totalPeriodo={reporte.totalFacturado}
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Productos más vendidos</h2>
          <ListaAgrupacion
            elementos={reporte.productosMasVendidos}
            totalPeriodo={reporte.totalFacturado}
          />
        </section>
      </div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ventas recientes</h2>
        <ListaVentas ventas={reporte.ventasRecientes} />
      </section>
    </section>
  )
}

function ListaAgrupacion({ elementos, cantidadEtiqueta = 'unidades', totalPeriodo = 0 }) {
  if (!elementos.length) return <p className="mt-4 text-sm text-slate-500">Sin datos para este período.</p>

  return (
    <ul className="mt-3 divide-y divide-slate-100">
      {elementos.map((item) => (
        <li className="flex items-center justify-between gap-3 py-3 text-sm" key={item.nombre}>
          <span>
            <span className="block text-slate-700">{item.nombre}</span>
            <span className="mt-1 block text-xs text-slate-500">
              {item.cantidad} {cantidadEtiqueta}
              {totalPeriodo > 0 ? ` · ${((item.total / totalPeriodo) * 100).toFixed(1)}%` : ''}
            </span>
          </span>
          <strong className="font-semibold text-slate-900">{formatearPrecio(item.total)}</strong>
        </li>
      ))}
    </ul>
  )
}

function ListaVentas({ ventas }) {
  return (
    <ul className="mt-3 divide-y divide-slate-100">
      {ventas.map((venta) => (
        <li className="py-2 text-sm" key={venta.id}>
          <details className="group rounded-lg">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-3 hover:bg-slate-50">
              <span>
                <span className="block font-medium text-slate-800">{new Date(venta.creadaEn).toLocaleString('es-CL')}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {venta.metodoPago} · {venta.estado === 'pendiente' ? 'Pendiente' : 'Sincronizada'} · {venta.items.reduce((total, item) => total + item.cantidad, 0)} unidades
                </span>
              </span>
              <span className="ml-auto flex items-center gap-3">
                <strong className="text-slate-900">{formatearPrecio(venta.total)}</strong>
                <span className="text-xs font-semibold text-emerald-800 group-open:hidden">Ver detalle</span>
                <span className="hidden text-xs font-semibold text-emerald-800 group-open:inline">Ocultar detalle</span>
              </span>
            </summary>
            <div className="mx-3 mb-3 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Productos de la venta
              </p>
              <ul className="divide-y divide-slate-200">
                {venta.items.map((item, indice) => (
                  <li className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2" key={`${venta.id}-${item.nombre}-${indice}`}>
                    <span className="text-slate-700">
                      {item.nombre} · {item.cantidad} × {formatearPrecio(item.totalLinea / item.cantidad)}
                    </span>
                    <strong className="text-slate-900">{formatearPrecio(item.totalLinea)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </li>
      ))}
    </ul>
  )
}

function InventarioDemo() {
  const stock = [
    { nombre: 'Helado de vainilla', categoria: 'Helados', disponible: 18, minimo: 8 },
    { nombre: 'Café en grano', categoria: 'Cafetería', disponible: 6, minimo: 10 },
    { nombre: 'Croissant', categoria: 'Panadería', disponible: 22, minimo: 12 },
    { nombre: 'Agua mineral', categoria: 'Otros', disponible: 31, minimo: 10 }
  ]

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventario</h1>
      <p className="mt-2 text-slate-600">Vista de existencias de ejemplo.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Producto</th>
              <th className="px-5 py-3 font-semibold">Categoría</th>
              <th className="px-5 py-3 text-right font-semibold">Disponible</th>
              <th className="px-5 py-3 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stock.map((item) => (
              <tr key={item.nombre}>
                <td className="px-5 py-4 font-medium text-slate-800">{item.nombre}</td>
                <td className="px-5 py-4 text-slate-600">{item.categoria}</td>
                <td className="px-5 py-4 text-right text-slate-700">{item.disponible}</td>
                <td className="px-5 py-4 text-right">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.disponible < item.minimo ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {item.disponible < item.minimo ? 'Reponer' : 'En stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdministracionDemo({
  productos,
  setProductos,
  usuarios,
  setUsuarios
}) {
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false)
  const [productoEditando, setProductoEditando] = useState('')
  const [formularioProducto, setFormularioProducto] = useState(formularioProductoDemoVacio)
  const [errorProducto, setErrorProducto] = useState('')
  const [mensajeProducto, setMensajeProducto] = useState('')
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'Cajero'
  })
  const [errorUsuario, setErrorUsuario] = useState('')
  const [usuarioCreado, setUsuarioCreado] = useState('')

  useEffect(() => {
    if (!modalProductoAbierto) return undefined

    document.getElementById('demo-product-name')?.focus()
    function cerrarConEscape(event) {
      if (event.key !== 'Escape') return
      setModalProductoAbierto(false)
      setProductoEditando('')
      setFormularioProducto(formularioProductoDemoVacio)
      setErrorProducto('')
    }

    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [modalProductoAbierto])

  function editarProductoDemo(producto) {
    setModalProductoAbierto(true)
    setProductoEditando(producto.id)
    setFormularioProducto({
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: String(producto.precio),
      detalle: producto.detalle ?? '',
      imagenUrl: producto.imagenUrl ?? ''
    })
    setErrorProducto('')
    setMensajeProducto('')
  }

  function cancelarEdicionProducto() {
    setModalProductoAbierto(false)
    setProductoEditando('')
    setFormularioProducto(formularioProductoDemoVacio)
    setErrorProducto('')
  }

  function guardarProductoDemo(event) {
    event.preventDefault()
    setErrorProducto('')
    setMensajeProducto('')

    const nombre = formularioProducto.nombre.trim()
    const precio = Number(formularioProducto.precio)
    const imagenUrl = formularioProducto.imagenUrl.trim()

    if (!nombre || !Number.isFinite(precio) || precio <= 0) {
      setErrorProducto('Ingresa un nombre y un precio mayor que cero.')
      return
    }

    if (imagenUrl) {
      try {
        const url = new URL(imagenUrl)
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL no segura')
      } catch {
        setErrorProducto('La foto debe tener una URL HTTP o HTTPS válida.')
        return
      }
    }

    const producto = {
      id: productoEditando || `demo-producto-${globalThis.crypto.randomUUID()}`,
      nombre,
      categoria: formularioProducto.categoria,
      precio,
      detalle: formularioProducto.detalle.trim(),
      imagenUrl
    }

    if (productoEditando) {
      setProductos((actuales) => actuales.map((actual) => (
        actual.id === productoEditando ? producto : actual
      )))
      setMensajeProducto(`Se actualizaron los datos de «${nombre}» en esta demostración.`)
    } else {
      setProductos((actuales) => [...actuales, producto])
      setMensajeProducto(`Se agregó «${nombre}» solo a esta demostración.`)
    }

    cancelarEdicionProducto()
  }

  function crearUsuarioDemo(event) {
    event.preventDefault()
    setErrorUsuario('')
    setUsuarioCreado('')

    const nombre = nuevoUsuario.nombre.trim()
    const email = nuevoUsuario.email.trim()
    const emailNormalizado = email.toLocaleLowerCase('es')

    if (usuarios.some((usuario) => usuario.email.toLocaleLowerCase('es') === emailNormalizado)) {
      setErrorUsuario('Ya existe una cuenta de demostración con ese correo.')
      return
    }

    setUsuarios((actuales) => [
      ...actuales,
      {
        id: `demo-usuario-${globalThis.crypto.randomUUID()}`,
        nombre,
        email,
        rol: nuevoUsuario.rol
      }
    ])
    setNuevoUsuario({ nombre: '', email: '', password: '', rol: 'Cajero' })
    setUsuarioCreado(`Se agregó la cuenta demostrativa de ${nombre}.`)
  }

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Administración</h1>
      <p className="mt-2 text-slate-600">Gestión de catálogo y cuentas de usuario de ejemplo.</p>
      {mensajeProducto && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          {mensajeProducto}
          <button
            className="ml-3 font-semibold underline"
            onClick={() => setMensajeProducto('')}
            type="button"
          >
            Cerrar
          </button>
        </p>
      )}
      <button
        className="mt-6 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
        onClick={() => {
          setProductoEditando('')
          setFormularioProducto(formularioProductoDemoVacio)
          setErrorProducto('')
          setMensajeProducto('')
          setModalProductoAbierto(true)
        }}
        type="button"
      >
        Agregar producto
      </button>
      {modalProductoAbierto && (
        <>
          <div
            aria-hidden="true"
            className="product-edit-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) cancelarEdicionProducto()
            }}
          />
          <form
            aria-labelledby="demo-product-form-title"
            aria-modal="true"
            className="product-edit-dialog grid gap-4 sm:grid-cols-2"
            onSubmit={guardarProductoDemo}
            role="dialog"
          >
        <h2 className="text-lg font-semibold text-slate-900 sm:col-span-2" id="demo-product-form-title">
          {productoEditando ? 'Editar producto' : 'Agregar producto'}
        </h2>
        {errorProducto && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2" role="alert">
            {errorProducto}
          </p>
        )}
        <label className="text-sm font-medium text-slate-700" htmlFor="demo-product-name">
          Nombre
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
            id="demo-product-name"
            maxLength={120}
            onChange={(event) => setFormularioProducto({ ...formularioProducto, nombre: event.target.value })}
            required
            value={formularioProducto.nombre}
          />
        </label>
        <label className="text-sm font-medium text-slate-700" htmlFor="demo-product-category">
          Categoría
          <select
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
            id="demo-product-category"
            onChange={(event) => setFormularioProducto({ ...formularioProducto, categoria: event.target.value })}
            value={formularioProducto.categoria}
          >
            {categorias.filter(({ id }) => id !== 'todos').map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700" htmlFor="demo-product-price">
          Precio
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
            id="demo-product-price"
            min="1"
            onChange={(event) => setFormularioProducto({ ...formularioProducto, precio: event.target.value })}
            required
            step="1"
            type="number"
            value={formularioProducto.precio}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="demo-product-detail">
          Descripción
          <textarea
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
            id="demo-product-detail"
            maxLength={240}
            onChange={(event) => setFormularioProducto({ ...formularioProducto, detalle: event.target.value })}
            rows={3}
            value={formularioProducto.detalle}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="demo-product-image">
          Foto del producto (URL pública opcional)
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
            id="demo-product-image"
            onChange={(event) => setFormularioProducto({ ...formularioProducto, imagenUrl: event.target.value })}
            placeholder="https://ejemplo.com/imagen-del-producto.jpg"
            type="url"
            value={formularioProducto.imagenUrl}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            La carga directa de archivos se agregará cuando exista el backend para almacenarlos.
          </span>
          {formularioProducto.imagenUrl && (
            <img
              alt={`Vista previa de ${formularioProducto.nombre || 'producto'}`}
              className="mt-3 h-24 w-24 rounded-lg border border-slate-200 object-cover"
              src={formularioProducto.imagenUrl}
            />
          )}
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900" type="submit">
            {productoEditando ? 'Confirmar cambios' : 'Confirmar producto'}
          </button>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={cancelarEdicionProducto}
            type="button"
          >
            Cancelar
          </button>
        </div>
          </form>
        </>
      )}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Catálogo ({productos.length})</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {productos.map((producto) => (
            <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" key={producto.id}>
              <div className="flex min-w-0 items-center gap-3">
                {producto.imagenUrl ? (
                  <img alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" src={producto.imagenUrl} />
                ) : (
                  <span aria-hidden="true" className="h-14 w-14 shrink-0 rounded-lg bg-slate-100" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{producto.nombre}</p>
                  <p className="text-slate-500">{categoriaNombre[producto.categoria]} · {producto.detalle || 'Sin descripción'}</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatearPrecio(producto.precio)}</p>
                </div>
              </div>
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => editarProductoDemo(producto)}
                type="button"
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Usuarios de demostración</h2>
        <p className="mt-1 text-sm text-slate-600">
          Las cuentas creadas aquí solo existen temporalmente en esta vista previa.
        </p>
        {errorUsuario && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            {errorUsuario}
          </p>
        )}
        {usuarioCreado && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
            {usuarioCreado}
          </p>
        )}
        <form className="mt-4 grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2" onSubmit={crearUsuarioDemo}>
          <label className="text-sm font-medium text-slate-700" htmlFor="demo-user-name">
            Nombre
            <input
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="demo-user-name"
              onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, nombre: event.target.value })}
              required
              value={nuevoUsuario.nombre}
            />
          </label>
          <label className="text-sm font-medium text-slate-700" htmlFor="demo-user-email">
            Correo electrónico
            <input
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="demo-user-email"
              onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, email: event.target.value })}
              required
              type="email"
              value={nuevoUsuario.email}
            />
          </label>
          <label className="text-sm font-medium text-slate-700" htmlFor="demo-user-password">
            Contraseña inicial
            <input
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="demo-user-password"
              onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, password: event.target.value })}
              required
              type="password"
              value={nuevoUsuario.password}
            />
          </label>
          <label className="text-sm font-medium text-slate-700" htmlFor="demo-user-role">
            Rol
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
              id="demo-user-role"
              onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, rol: event.target.value })}
              value={nuevoUsuario.rol}
            >
              <option value="Cajero">Cajero</option>
              <option value="Administrador">Administrador</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900" type="submit">
              Crear usuario de demostración
            </button>
          </div>
        </form>
        <h3 className="mt-6 font-semibold text-slate-900">Cuentas ({usuarios.length})</h3>
        <ul className="mt-3 divide-y divide-slate-100">
          {usuarios.map((usuario) => (
            <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" key={usuario.id}>
              <span>
                <strong>{usuario.nombre}</strong>
                <span className="ml-3 text-slate-500">{usuario.email}</span>
              </span>
              <span className="font-medium text-emerald-800">{usuario.rol}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}

export default PreviewPage
