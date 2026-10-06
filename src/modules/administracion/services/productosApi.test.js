import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizarProductoApi } from './productosApi.js'

describe('normalizarProductoApi', () => {
  it('adapta el contrato REST al modelo local en español', () => {
    assert.deepEqual(normalizarProductoApi({
      id: 'p-1',
      name: 'Café',
      category: 'cafeteria',
      price: 1800,
      detail: 'Taza',
      imageUrl: 'https://cdn.example.test/cafe.jpg'
    }), {
      id: 'p-1',
      nombre: 'Café',
      categoria: 'cafeteria',
      precio: 1800,
      detalle: 'Taza',
      imagenUrl: 'https://cdn.example.test/cafe.jpg'
    })
  })

  it('rechaza respuestas con campos requeridos inválidos', () => {
    assert.throws(
      () => normalizarProductoApi({
        id: 'p-1',
        name: 'Café',
        category: 'cafeteria',
        price: '1800'
      }),
      /campos inválidos/
    )
  })

  it('permite que productos existentes no tengan imagen', () => {
    assert.equal(normalizarProductoApi({
      id: 'p-2',
      name: 'Medialuna',
      category: 'panaderia',
      price: 900
    }).imagenUrl, '')
  })

  it('rechaza una URL de imagen con protocolo no seguro', () => {
    assert.throws(
      () => normalizarProductoApi({
        id: 'p-3',
        name: 'Producto',
        category: 'otros',
        price: 1000,
        imageUrl: 'javascript:alert(1)'
      }),
      /HTTP o HTTPS/
    )
  })
})
