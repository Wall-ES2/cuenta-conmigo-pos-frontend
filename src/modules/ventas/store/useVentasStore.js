import { create } from 'zustand'
import { categorias, productosIniciales } from '../data/productos.js'
import {
  guardarConfiguracionSincronizacion,
  solicitarSincronizacionEnSegundoPlano,
  ventasDatabase
} from '../data/ventasDatabase.js'
import {
  obtenerEndpointSincronizacion,
  obtenerRutaSincronizacion,
  sincronizarVentasPendientes
} from '../services/sincronizarVentas.js'
import { listarProductosApi } from '../../administracion/services/productosApi.js'

const categoriasValidas = new Set(categorias.filter(({ id }) => id !== 'todos').map(({ id }) => id))
const endpointSincronizacion = obtenerEndpointSincronizacion()
let inicializacionEnCurso

function validarProducto(producto) {
  if (!producto || typeof producto !== 'object') {
    throw new Error('Los datos del producto no son válidos.')
  }

  const nombre = producto.nombre?.trim()

  if (!nombre) {
    throw new Error('El producto debe tener un nombre.')
  }

  if (!categoriasValidas.has(producto.categoria)) {
    throw new Error('Selecciona una categoría válida para el producto.')
  }

  if (!Number.isFinite(producto.precio) || producto.precio <= 0) {
    throw new Error('El precio del producto debe ser mayor que cero.')
  }

  const imagenUrl = producto.imagenUrl?.trim() ?? ''
  if (imagenUrl) {
    let url
    try {
      url = new URL(imagenUrl)
    } catch (error) {
      throw new Error('La URL de imagen debe ser un enlace HTTP o HTTPS.', { cause: error })
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('La URL de imagen debe ser un enlace HTTP o HTTPS.')
    }
  }

  return {
    ...producto,
    nombre,
    detalle: producto.detalle?.trim() ?? '',
    imagenUrl
  }
}

async function contarVentasPendientes() {
  return ventasDatabase.colaSincronizacion.count()
}

export const useVentasStore = create((set, get) => ({
  productos: [...productosIniciales],
  carrito: [],
  inicializado: false,
  errorAlmacenamiento: '',
  errorServiceWorker: '',
  cantidadPendiente: 0,
  estadoSincronizacion: 'sin-configurar',
  errorSincronizacion: '',
  errorCatalogoApi: '',
  guardandoVenta: false,

  inicializar: () => {
    if (inicializacionEnCurso) return inicializacionEnCurso

    inicializacionEnCurso = (async () => {
      try {
        await ventasDatabase.open()
        await guardarConfiguracionSincronizacion(endpointSincronizacion)

        const [productos, cantidadPendiente] = await Promise.all([
          ventasDatabase.productos.toArray(),
          contarVentasPendientes()
        ])

        set({
          productos,
          cantidadPendiente,
          inicializado: true,
          errorAlmacenamiento: '',
          estadoSincronizacion: endpointSincronizacion
            ? (cantidadPendiente > 0 ? 'pendiente' : 'sincronizada')
            : (cantidadPendiente > 0 ? 'sin-configurar' : 'sin-configurar'),
          errorSincronizacion: ''
        })

        return true
      } catch (error) {
        set({
          inicializado: false,
          errorAlmacenamiento: error instanceof Error
            ? error.message
            : 'No se pudo inicializar el almacenamiento local.'
        })
        inicializacionEnCurso = undefined
        throw error
      }
    })()

    return inicializacionEnCurso
  },

  cargarCatalogoDesdeApi: async () => {
    try {
      const productos = await listarProductosApi()
      const productosPersistidos = productos.map((producto) => ({
        ...validarProducto(producto),
        id: producto.id,
        actualizadoEn: new Date().toISOString()
      }))

      await ventasDatabase.transaction('rw', ventasDatabase.productos, async () => {
        await ventasDatabase.productos.clear()
        if (productosPersistidos.length > 0) {
          await ventasDatabase.productos.bulkAdd(productosPersistidos)
        }
      })

      set({ productos: productosPersistidos, errorCatalogoApi: '' })
      return productosPersistidos
    } catch (error) {
      set({
        errorCatalogoApi: error instanceof Error
          ? error.message
          : 'No se pudo cargar el catálogo desde el backend.'
      })
      throw error
    }
  },

  agregarProductoCatalogo: async (producto) => {
    const nuevoProducto = validarProducto(producto)
    const id = nuevoProducto.id ?? globalThis.crypto.randomUUID()
    const productoPersistido = {
      ...nuevoProducto,
      id,
      actualizadoEn: new Date().toISOString()
    }

    if (get().productos.some((item) => item.id === id)) {
      throw new Error(`Ya existe un producto con el identificador "${id}".`)
    }

    await ventasDatabase.productos.add(productoPersistido)
    set((state) => ({
      productos: [...state.productos, productoPersistido]
    }))
  },

  actualizarProductoCatalogo: async (id, cambios) => {
    const productoActual = get().productos.find((producto) => producto.id === id)

    if (!productoActual) {
      throw new Error(`No se encontró el producto "${id}".`)
    }

    const productoActualizado = validarProducto({
      ...productoActual,
      ...cambios,
      id,
      actualizadoEn: new Date().toISOString()
    })

    await ventasDatabase.productos.put(productoActualizado)
    set((state) => ({
      productos: state.productos.map((producto) => (
        producto.id === id ? productoActualizado : producto
      ))
    }))
  },

  eliminarProductoCatalogo: async (id) => {
    if (!get().productos.some((producto) => producto.id === id)) {
      throw new Error(`No se encontró el producto "${id}".`)
    }

    await ventasDatabase.productos.delete(id)
    set((state) => ({
      productos: state.productos.filter((producto) => producto.id !== id)
    }))
  },

  agregarAlCarrito: (id) => {
    const producto = get().productos.find((item) => item.id === id)

    if (!producto) {
      throw new Error(`No se puede agregar "${id}": el producto no está en el catálogo.`)
    }

    set((state) => {
      const lineaExistente = state.carrito.find((item) => item.id === id)

      return {
        carrito: lineaExistente
          ? state.carrito.map((item) => (
            item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item
          ))
          : [...state.carrito, { ...producto, cantidad: 1 }]
      }
    })
  },

  aumentarCantidad: (id) => {
    set((state) => ({
      carrito: state.carrito.map((item) => (
        item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item
      ))
    }))
  },

  disminuirCantidad: (id) => {
    set((state) => ({
      carrito: state.carrito
        .map((item) => (
          item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
        ))
        .filter((item) => item.cantidad > 0)
    }))
  },

  quitarDelCarrito: (id) => {
    set((state) => ({
      carrito: state.carrito.filter((item) => item.id !== id)
    }))
  },

  vaciarCarrito: () => set({ carrito: [] }),

  registrarVenta: async (metodoPago) => {
    const { carrito } = get()

    if (carrito.length === 0) {
      throw new Error('No se puede registrar una venta sin productos.')
    }

    if (get().guardandoVenta) {
      throw new Error('Ya se está guardando una venta.')
    }

    const creadaEn = new Date().toISOString()
    const venta = {
      id: globalThis.crypto.randomUUID(),
      items: carrito.map(({ id, nombre, categoria, precio, cantidad }) => ({
        productoId: id,
        nombre,
        categoria,
        precioUnitario: precio,
        cantidad,
        totalLinea: precio * cantidad
      })),
      total: carrito.reduce((total, item) => total + item.precio * item.cantidad, 0),
      metodoPago,
      creadaEn,
      estado: 'pendiente'
    }

    set({ guardandoVenta: true })
    try {
      await ventasDatabase.transaction(
        'rw',
        ventasDatabase.ventas,
        ventasDatabase.colaSincronizacion,
        async () => {
          await ventasDatabase.ventas.add(venta)
          await ventasDatabase.colaSincronizacion.add({
            id: venta.id,
            creadaEn,
            intentos: 0,
            reclamoHasta: 0
          })
        }
      )
    } catch (error) {
      set({ guardandoVenta: false })
      throw error
    }

    const cantidadPendiente = get().cantidadPendiente + 1
    set({
      carrito: [],
      guardandoVenta: false,
      cantidadPendiente,
      estadoSincronizacion: endpointSincronizacion ? 'pendiente' : 'sin-configurar',
      errorSincronizacion: ''
    })

    if (endpointSincronizacion) {
      try {
        await solicitarSincronizacionEnSegundoPlano()
      } catch (error) {
        set({
          errorSincronizacion: error instanceof Error
            ? `No se pudo programar la sincronización en segundo plano: ${error.message}`
            : 'No se pudo programar la sincronización en segundo plano.'
        })
      }

      if (navigator.onLine) await get().sincronizarPendientes()
    }

    return venta
  },

  sincronizarPendientes: async () => {
    if (!endpointSincronizacion) {
      set({ estadoSincronizacion: 'sin-configurar' })
      return { estado: 'esperando-configuracion', sincronizadas: 0 }
    }

    set({ estadoSincronizacion: 'sincronizando', errorSincronizacion: '' })

    try {
      const resultado = await sincronizarVentasPendientes({
        endpoint: obtenerRutaSincronizacion()
      })
      const cantidadPendiente = await contarVentasPendientes()

      set({
        cantidadPendiente,
        estadoSincronizacion: resultado.estado,
        errorSincronizacion: resultado.error ?? ''
      })

      return resultado
    } catch (error) {
      set({
        cantidadPendiente: await contarVentasPendientes(),
        estadoSincronizacion: 'error',
        errorSincronizacion: error instanceof Error
          ? error.message
          : 'No se pudieron sincronizar las ventas pendientes.'
      })
      throw error
    }
  },

  refrescarColaSincronizacion: async () => {
    const cantidadPendiente = await contarVentasPendientes()
    set({
      cantidadPendiente,
      estadoSincronizacion: cantidadPendiente > 0
        ? (endpointSincronizacion ? 'pendiente' : 'sin-configurar')
        : (endpointSincronizacion ? 'sincronizada' : 'sin-configurar')
    })
  },

  informarErrorServiceWorker: (error) => {
    set({
      errorServiceWorker: error instanceof Error
        ? error.message
        : 'No se pudo habilitar el modo offline de la aplicación.'
    })
  }
}))
