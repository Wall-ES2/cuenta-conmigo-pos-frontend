export const categorias = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'helados', nombre: 'Helados' },
  { id: 'cafeteria', nombre: 'Cafetería' },
  { id: 'panaderia', nombre: 'Panadería' },
  { id: 'otros', nombre: 'Otros' }
]

export const productosIniciales = []

export function formatearPrecio(precio) {
  return `$ ${precio.toLocaleString('es-CL')}`
}
