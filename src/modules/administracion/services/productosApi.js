import { apiRequest } from '../../../services/apiClient.js'

export async function listarProductosApi() {
  const response = await apiRequest('/products')

  if (!Array.isArray(response)) {
    throw new Error('El backend debe devolver una lista de productos en /products.')
  }

  return response.map(normalizarProductoApi)
}

export async function crearProductoApi(producto) {
  const response = await apiRequest('/products', {
    method: 'POST',
    body: serializarProducto(producto),
    headers: { 'Idempotency-Key': producto.id }
  })

  return normalizarProductoApi(response)
}

export async function actualizarProductoApi(producto) {
  const response = await apiRequest(`/products/${encodeURIComponent(producto.id)}`, {
    method: 'PUT',
    body: serializarProducto(producto)
  })

  return normalizarProductoApi(response)
}

export async function eliminarProductoApi(id) {
  await apiRequest(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function normalizarProductoApi(producto) {
  if (
    !producto
    || typeof producto.id !== 'string'
    || typeof producto.name !== 'string'
    || typeof producto.category !== 'string'
    || !Number.isFinite(producto.price)
  ) {
    throw new Error('El backend devolvió un producto con campos inválidos.')
  }

  const imagenUrl = normalizarImagenUrl(producto.imageUrl)

  return {
    id: producto.id,
    nombre: producto.name,
    categoria: producto.category,
    precio: producto.price,
    detalle: typeof producto.detail === 'string' ? producto.detail : '',
    imagenUrl
  }
}

export function normalizarImagenUrl(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') {
    throw new Error('La URL de imagen debe ser un enlace HTTP o HTTPS.')
  }

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Protocolo inválido.')
    return url.href
  } catch (error) {
    throw new Error('La URL de imagen debe ser un enlace HTTP o HTTPS.', { cause: error })
  }
}

function serializarProducto(producto) {
  return {
    id: producto.id,
    name: producto.nombre,
    category: producto.categoria,
    price: producto.precio,
    detail: producto.detalle,
    imageUrl: normalizarImagenUrl(producto.imagenUrl) || null
  }
}
