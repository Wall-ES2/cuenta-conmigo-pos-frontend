import { formatearPrecio } from '../data/productos'

const nombresCategorias = {
  helados: 'Helados',
  cafeteria: 'Cafetería',
  panaderia: 'Panadería',
  otros: 'Otros'
}

function ProductoCard({ producto, onAgregar }) {
  return (
    <button
      aria-label={`Agregar ${producto.nombre} al carrito`}
      className="sales-product-card"
      onClick={() => onAgregar(producto)}
      type="button"
    >
      <span aria-hidden="true" className="sales-product-image" />
      <span className="sales-product-copy">
        <span className="sales-product-category">
          {nombresCategorias[producto.categoria] ?? producto.categoria}
        </span>
        <span className="sales-product-name">{producto.nombre}</span>
        <span className="sales-product-detail">{producto.detalle}</span>
      </span>
      <span className="sales-product-footer">
        <strong>{formatearPrecio(producto.precio)}</strong>
        <span className="sales-add-label">Agregar <span aria-hidden="true">+</span></span>
      </span>
    </button>
  )
}

export default ProductoCard
