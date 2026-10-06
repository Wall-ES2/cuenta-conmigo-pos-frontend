import { useMemo, useState } from 'react'
import CarritoVentas from './components/CarritoVentas'
import ProductoCard from './components/ProductoCard'
import { categorias, formatearPrecio } from './data/productos'
import { useVentasStore } from './store/useVentasStore'
import './ventas.css'

function VentasPage() {
  const [categoriaActiva, setCategoriaActiva] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarCobro, setMostrarCobro] = useState(false)
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const productos = useVentasStore((state) => state.productos)
  const carrito = useVentasStore((state) => state.carrito)
  const inicializado = useVentasStore((state) => state.inicializado)
  const errorAlmacenamiento = useVentasStore((state) => state.errorAlmacenamiento)
  const errorServiceWorker = useVentasStore((state) => state.errorServiceWorker)
  const errorSincronizacion = useVentasStore((state) => state.errorSincronizacion)
  const errorCatalogoApi = useVentasStore((state) => state.errorCatalogoApi)
  const guardandoVenta = useVentasStore((state) => state.guardandoVenta)
  const agregarAlCarrito = useVentasStore((state) => state.agregarAlCarrito)
  const aumentarCantidad = useVentasStore((state) => state.aumentarCantidad)
  const disminuirCantidad = useVentasStore((state) => state.disminuirCantidad)
  const quitarDelCarrito = useVentasStore((state) => state.quitarDelCarrito)
  const vaciarCarritoStore = useVentasStore((state) => state.vaciarCarrito)
  const registrarVenta = useVentasStore((state) => state.registrarVenta)

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es')

    return productos.filter((producto) => {
      const coincideCategoria = categoriaActiva === 'todos' || producto.categoria === categoriaActiva
      const coincideBusqueda = producto.nombre.toLocaleLowerCase('es').includes(termino)
      return coincideCategoria && coincideBusqueda
    })
  }, [busqueda, categoriaActiva, productos])

  const subtotal = carrito.reduce((total, item) => total + item.precio * item.cantidad, 0)

  function agregarProducto(producto) {
    setMensaje('')
    agregarAlCarrito(producto.id)
  }

  function quitarProducto(id) {
    quitarDelCarrito(id)
  }

  function vaciarCarrito() {
    vaciarCarritoStore()
    setMensaje('')
  }

  async function confirmarCobro() {
    setError('')

    try {
      const venta = await registrarVenta(metodoPago)
      const estadoActual = useVentasStore.getState()
      setMostrarCobro(false)
      setMensaje(
        estadoActual.errorSincronizacion
          ? `Venta ${venta.id} guardada localmente. La sincronización falló: ${estadoActual.errorSincronizacion}`
          : estadoActual.estadoSincronizacion === 'sincronizada'
            ? `Venta ${venta.id} guardada localmente y sincronizada con la API.`
            : `Venta ${venta.id} guardada localmente y en la cola de sincronización.`
      )
    } catch (errorAlRegistrar) {
      setError(errorAlRegistrar instanceof Error
        ? errorAlRegistrar.message
        : 'No se pudo guardar la venta localmente.')
    }
  }

  return (
    <div className="sales-page">
      <header className="sales-header">
        <div>
          <h1>Ventas</h1>
          <p>Selecciona productos y prepara el pedido.</p>
        </div>
        <span className="sales-day-label">Punto de venta</span>
      </header>

      {errorAlmacenamiento && (
        <div className="sales-status sales-status-error" role="alert">
          No se puede operar sin almacenamiento local: {errorAlmacenamiento}
        </div>
      )}

      {errorServiceWorker && (
        <div className="sales-status sales-status-error" role="alert">
          El almacenamiento local sigue disponible, pero el Service Worker no se activó:
          {' '}{errorServiceWorker}
        </div>
      )}

      {errorSincronizacion && (
        <div className="sales-status sales-status-error" role="alert">
          La venta permanece guardada localmente, pero ocurrió un error al sincronizar:
          {' '}{errorSincronizacion}
        </div>
      )}

      {errorCatalogoApi && (
        <div className="sales-status sales-status-error" role="alert">
          No se pudo actualizar el catálogo desde el servidor. Se conserva el catálogo local:
          {' '}{errorCatalogoApi}
        </div>
      )}

      {mensaje && (
        <div className="sales-status" role="status">
          <span>{mensaje}</span>
          <button aria-label="Cerrar aviso" onClick={() => setMensaje('')} type="button">×</button>
        </div>
      )}

      <div className="sales-layout">
        <section aria-label="Catálogo de productos" className="sales-catalog">
          {!inicializado ? (
            <div className="sales-empty-catalog" role="status">
              Abriendo almacenamiento local...
            </div>
          ) : productos.length === 0 ? (
            <div className="sales-empty-catalog" role="status">
              <strong>El catálogo todavía no tiene productos</strong>
              <p>
                Esta pantalla se completará con productos cargados desde Administración
                por un usuario con permisos. El catálogo comienza vacío.
              </p>
            </div>
          ) : (
            <>
              <div className="sales-toolbar">
                <div>
                  <h2>Productos</h2>
                  <p>Selecciona un producto para agregarlo a la venta.</p>
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

              <nav aria-label="Categorías de productos" className="sales-categories">
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
              </nav>

              <div className="sales-product-grid">
                {productosFiltrados.length > 0 ? (
                  productosFiltrados.map((producto) => (
                    <ProductoCard
                      key={producto.id}
                      onAgregar={agregarProducto}
                      producto={producto}
                    />
                  ))
                ) : (
                  <p className="sales-no-results">No encontramos productos con esa búsqueda.</p>
                )}
              </div>
            </>
          )}
        </section>

        <CarritoVentas
          items={carrito}
          onAumentar={aumentarCantidad}
          onCobrar={() => {
            setError('')
            setMostrarCobro(true)
          }}
          onDisminuir={disminuirCantidad}
          onQuitar={quitarProducto}
          onVaciar={vaciarCarrito}
          subtotal={subtotal}
        />
      </div>

      {mostrarCobro && (
        <div
          className="sales-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setMostrarCobro(false)
          }}
        >
          <section
            aria-labelledby="sales-modal-title"
            aria-modal="true"
            className="sales-modal"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMostrarCobro(false)
            }}
            role="dialog"
          >
            <h2 id="sales-modal-title">Registrar venta</h2>
            <p>La venta se registrará localmente y quedará en cola para sincronización.</p>
            <div aria-label="Medio de pago" className="sales-payment-methods">
              {['Efectivo', 'Tarjeta', 'Transferencia'].map((metodo) => (
                <button
                  aria-pressed={metodoPago === metodo}
                  className="sales-payment-method"
                  key={metodo}
                  onClick={() => setMetodoPago(metodo)}
                  type="button"
                >
                  {metodo}
                </button>
              ))}
            </div>
            <div className="sales-modal-total">
              <span>Total de la venta</span>
              <strong>{formatearPrecio(subtotal)}</strong>
            </div>
            <p>
              Estado de pago: {metodoPago}. La API y el procesamiento real del pago se
              integrarán en la Fase 4.
            </p>
            {error && <p className="sales-form-error" role="alert">{error}</p>}
            <div className="sales-modal-actions">
              <button
                className="sales-modal-cancel"
                onClick={() => setMostrarCobro(false)}
                type="button"
              >
                Volver
              </button>
              <button
                className="sales-modal-confirm"
                disabled={guardandoVenta || Boolean(errorAlmacenamiento)}
                onClick={confirmarCobro}
                type="button"
              >
                {guardandoVenta ? 'Guardando...' : 'Confirmar venta'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default VentasPage
