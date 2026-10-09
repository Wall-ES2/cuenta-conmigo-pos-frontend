import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calcularReporteVentas } from './reportesVentas.js'

function crearVenta({ id, fecha, total, items, estado = 'sincronizada', metodoPago = 'Efectivo' }) {
  return { id, creadaEn: fecha, total, items, estado, metodoPago }
}

describe('calcularReporteVentas', () => {
  it('calcula totales, promedio, pendientes, métodos y productos dentro del período', () => {
    const ahora = new Date(2026, 9, 6, 12)
    const hoy = new Date(2026, 9, 6, 10).toISOString()
    const ayer = new Date(2026, 9, 5, 10).toISOString()
    const fueraDePeriodo = new Date(2026, 8, 28, 10).toISOString()
    const ventas = [
      crearVenta({
        id: 'venta-1',
        fecha: hoy,
        total: 3000,
        items: [
          { nombre: 'Cucurucho simple', categoria: 'helados', cantidad: 2, totalLinea: 3000, costoUnitario: 500, sabores: [{ productoId: 'vainilla', nombre: 'Vainilla' }] }
        ],
        estado: 'pendiente',
        metodoPago: 'Efectivo'
      }),
      crearVenta({
        id: 'venta-2',
        fecha: ayer,
        total: 2000,
        items: [
          { nombre: 'Café', categoria: 'cafeteria', cantidad: 1, totalLinea: 2000 }
        ],
        metodoPago: 'Tarjeta'
      }),
      crearVenta({
        id: 'venta-antigua',
        fecha: fueraDePeriodo,
        total: 1000,
        items: [{ nombre: 'Pan', categoria: 'panaderia', cantidad: 1, totalLinea: 1000 }]
      })
    ]

    const reporte = calcularReporteVentas(ventas, ahora, 7)

    assert.equal(reporte.totalFacturado, 5000)
    assert.equal(reporte.cantidadVentas, 2)
    assert.equal(reporte.unidadesVendidas, 3)
    assert.equal(reporte.promedioPorVenta, 2500)
    assert.equal(reporte.ventasPendientes, 1)
    assert.equal(reporte.montoPendiente, 3000)
    assert.deepEqual(reporte.porMetodo.map(({ nombre }) => nombre), ['Efectivo', 'Tarjeta'])
    assert.equal(reporte.porCategoria[0].nombre, 'helados')
    assert.equal(reporte.productosMasVendidos[0].nombre, 'Cucurucho simple')
    assert.equal(reporte.productosPorCategoria.helados[0].nombre, 'Cucurucho simple')
    assert.equal(reporte.saboresMasElegidos[0].nombre, 'Vainilla')
    assert.equal(reporte.saboresMasElegidos[0].cantidad, 2)
    assert.equal(reporte.dias.length, 7)
    assert.equal(reporte.dias[6].total, 3000)
    assert.equal(reporte.dias[6].porCategoria.helados.total, 3000)
    assert.equal(reporte.ventasRecientes[0].id, 'venta-1')
  })

  it('retorna indicadores en cero y días vacíos cuando no hay ventas', () => {
    const reporte = calcularReporteVentas([], new Date(2026, 9, 6, 12), 1)

    assert.equal(reporte.totalFacturado, 0)
    assert.equal(reporte.cantidadVentas, 0)
    assert.equal(reporte.unidadesVendidas, 0)
    assert.equal(reporte.promedioPorVenta, 0)
    assert.equal(reporte.dias.length, 1)
    assert.equal(reporte.dias[0].total, 0)
    assert.deepEqual(reporte.porMetodo, [])
    assert.deepEqual(reporte.ventasRecientes, [])
  })

  it('calcula facturacion historica sin exponer estimaciones de costos', () => {
    const reporte = calcularReporteVentas([
      crearVenta({
        id: 'venta-con-costo',
        fecha: new Date(2026, 9, 6, 10).toISOString(),
        total: 3000,
        items: [{ nombre: 'Cucurucho', categoria: 'helados', cantidad: 2, totalLinea: 3000, costoUnitario: 700 }],
      }),
    ], new Date(2026, 9, 6, 12), 1)

    assert.equal(reporte.totalFacturadoHistorico, 3000)
    assert.equal(Object.hasOwn(reporte, 'costoMercaderia'), false)
    assert.equal(Object.hasOwn(reporte, 'gananciaBruta'), false)
    assert.equal(Object.hasOwn(reporte, 'margenBrutoPorcentaje'), false)
  })

  it('informa datos corruptos en lugar de omitirlos silenciosamente', () => {
    assert.throws(
      () => calcularReporteVentas([
        crearVenta({
          id: 'venta-corrupta',
          fecha: 'no-es-fecha',
          total: 100,
          items: []
        })
      ], new Date(), 7),
      /fecha inválida/
    )
  })
})
