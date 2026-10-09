import { formatearPrecio } from "../data/productos";

const nombresCategorias = {
  helados: "Helados",
  licuados: "Licuados",
  infusiones: "Infusiones",
  bebidas: "Bebidas",
  cafeteria: "Cafetería",
  panaderia: "Panadería",
  otros: "Otros",
};

function ProductoCard({ producto, onAgregar }) {
  const sinStock =
    (producto.controlaStock || producto.esSabor) &&
    (!Number.isInteger(producto.stockDisponible) ||
      producto.stockDisponible < 1);

  return (
    <button
      aria-label={
        sinStock
          ? `${producto.nombre} no disponible: registra o repón su stock`
          : `${producto.configuracionVenta ? "Configurar" : "Agregar"} ${producto.nombre}${producto.configuracionVenta ? " en el carrito" : " al carrito"}`
      }
      className="sales-product-card"
      disabled={sinStock}
      onClick={() => onAgregar(producto)}
      type="button"
    >
      <span aria-hidden="true" className="sales-product-image">
        {producto.imagenUrl && <img alt="" src={producto.imagenUrl} />}
      </span>
      <span className="sales-product-copy">
        <span className="sales-product-category">
          {nombresCategorias[producto.categoria] ?? producto.categoria}
        </span>
        <span className="sales-product-name">{producto.nombre}</span>
        <span className="sales-product-detail">{producto.detalle}</span>
      </span>
      <span className="sales-product-footer">
        <strong>{formatearPrecio(producto.precio)}</strong>
        <span className="sales-add-label">
          {sinStock
            ? Number.isInteger(producto.stockDisponible)
              ? "Agotado"
              : "Cargar stock"
            : producto.configuracionVenta
              ? "Elegir bochas"
              : "Agregar"}{" "}
          <span aria-hidden="true">+</span>
        </span>
      </span>
    </button>
  );
}

export default ProductoCard;
