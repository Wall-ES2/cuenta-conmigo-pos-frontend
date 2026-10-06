import { ventasDatabase } from '../../ventas/data/ventasDatabase.js'

export const PERIODOS_REPORTE = {
  hoy: { etiqueta: 'Hoy', dias: 1 },
  sieteDias: { etiqueta: 'Últimos 7 días', dias: 7 },
  treintaDias: { etiqueta: 'Últimos 30 días', dias: 30 }
}

export async function cargarVentasLocales() {
  await ventasDatabase.open()
  return ventasDatabase.ventas.orderBy('creadaEn').toArray()
}

export function calcularReporteVentas(ventas, fechaActual = new Date(), cantidadDias = 7) {
  const hasta = new Date(fechaActual)
  hasta.setHours(23, 59, 59, 999)

  const desde = new Date(fechaActual)
  desde.setHours(0, 0, 0, 0)
  desde.setDate(desde.getDate() - cantidadDias + 1)

  const ventasPeriodo = ventas.filter((venta) => {
    const fecha = new Date(venta.creadaEn)
    if (Number.isNaN(fecha.getTime())) {
      throw new Error('Hay una venta guardada con una fecha inválida.')
    }

    if (!Number.isFinite(venta.total) || venta.total < 0 || !Array.isArray(venta.items)) {
      throw new Error('Hay una venta guardada con datos incompletos.')
    }

    return fecha >= desde && fecha <= hasta
  })

  const dias = Array.from({ length: cantidadDias }, (_, indice) => {
    const fecha = new Date(desde)
    fecha.setDate(desde.getDate() + indice)
    return {
      fecha,
      clave: claveFecha(fecha),
      total: 0,
      cantidad: 0
    }
  })
  const porDia = new Map(dias.map((dia) => [dia.clave, dia]))
  const porMetodo = new Map()
  const porCategoria = new Map()
  const porProducto = new Map()
  let totalFacturado = 0
  let unidadesVendidas = 0
  let ventasPendientes = 0
  let montoPendiente = 0

  for (const venta of ventasPeriodo) {
    const fecha = new Date(venta.creadaEn)
    const dia = porDia.get(claveFecha(fecha))
    if (!dia) continue

    totalFacturado += venta.total
    dia.total += venta.total
    dia.cantidad += 1

    if (venta.estado === 'pendiente') {
      ventasPendientes += 1
      montoPendiente += venta.total
    }

    sumarAgrupado(porMetodo, venta.metodoPago || 'Sin especificar', venta.total, 1)

    for (const item of venta.items) {
      if (
        !item
        || typeof item.nombre !== 'string'
        || typeof item.categoria !== 'string'
        || !Number.isFinite(item.cantidad)
        || !Number.isFinite(item.totalLinea)
      ) {
        throw new Error('Hay una venta con un producto que no se puede incluir en el reporte.')
      }

      unidadesVendidas += item.cantidad
      sumarAgrupado(porCategoria, item.categoria, item.totalLinea, item.cantidad)
      sumarAgrupado(porProducto, item.nombre, item.totalLinea, item.cantidad)
    }
  }

  return {
    desde,
    hasta,
    dias,
    totalFacturado,
    cantidadVentas: ventasPeriodo.length,
    unidadesVendidas,
    promedioPorVenta: ventasPeriodo.length ? totalFacturado / ventasPeriodo.length : 0,
    ventasPendientes,
    montoPendiente,
    porMetodo: ordenarPorTotal(porMetodo),
    porCategoria: ordenarPorTotal(porCategoria),
    productosMasVendidos: ordenarPorCantidad(porProducto).slice(0, 5),
    ventasRecientes: [...ventasPeriodo].sort(
      (a, b) => new Date(b.creadaEn) - new Date(a.creadaEn)
    ).slice(0, 8)
  }
}

function sumarAgrupado(agrupacion, clave, total, cantidad) {
  const actual = agrupacion.get(clave) ?? { nombre: clave, total: 0, cantidad: 0 }
  actual.total += total
  actual.cantidad += cantidad
  agrupacion.set(clave, actual)
}

function ordenarPorTotal(agrupacion) {
  return [...agrupacion.values()].sort((a, b) => b.total - a.total)
}

function ordenarPorCantidad(agrupacion) {
  return [...agrupacion.values()].sort((a, b) => b.cantidad - a.cantidad)
}

function claveFecha(fecha) {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}
