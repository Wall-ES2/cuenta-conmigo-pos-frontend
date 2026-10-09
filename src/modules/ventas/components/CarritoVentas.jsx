import { formatearPrecio } from "../data/productos";

function CarritoVentas({
  items,
  subtotal,
  onAumentar,
  onDisminuir,
  onQuitar,
  onVaciar,
  onCobrar,
  notaVenta = "La venta se guarda primero en este dispositivo.",
}) {
  const cantidadProductos = items.reduce(
    (total, item) => total + item.cantidad,
    0,
  );

  return (
    <aside aria-label="Carrito de venta" className="sales-cart">
      <div className="sales-cart-heading">
        <div>
          <h2>Carrito</h2>
          <p>
            {cantidadProductos}{" "}
            {cantidadProductos === 1 ? "producto" : "productos"}
          </p>
        </div>
        {items.length > 0 && (
          <button
            className="sales-text-button"
            onClick={onVaciar}
            type="button"
          >
            Vaciar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="sales-cart-empty">
          <strong>Tu carrito está vacío</strong>
          <span>Selecciona productos para comenzar la venta.</span>
        </div>
      ) : (
        <ul className="sales-cart-items">
          {items.map((item) => {
            const lineId = item.lineId ?? item.id;
            const detalleSabores = item.sabores
              ?.map((sabor) => sabor.nombre)
              .join(", ");

            return (
              <li className="sales-cart-item" key={lineId}>
                <div className="sales-cart-item-info">
                  <strong>{item.nombre}</strong>
                  {detalleSabores && <span>Sabores: {detalleSabores}</span>}
                  <span>{formatearPrecio(item.precio)} c/u</span>
                  <button
                    aria-label={`Quitar ${item.nombre}${detalleSabores ? ` con ${detalleSabores}` : ""} del carrito`}
                    className="sales-remove-button"
                    onClick={() => onQuitar(lineId)}
                    type="button"
                  >
                    Quitar
                  </button>
                </div>
                <div className="sales-cart-item-actions">
                  <div
                    aria-label={`Cantidad de ${item.nombre}${detalleSabores ? ` con ${detalleSabores}` : ""}`}
                    className="sales-quantity-control"
                  >
                    <button
                      aria-label={`Disminuir cantidad de ${item.nombre}${detalleSabores ? ` con ${detalleSabores}` : ""}`}
                      onClick={() => onDisminuir(lineId)}
                      type="button"
                    >
                      −
                    </button>
                    <span>{item.cantidad}</span>
                    <button
                      aria-label={`Aumentar cantidad de ${item.nombre}${detalleSabores ? ` con ${detalleSabores}` : ""}`}
                      onClick={() => onAumentar(lineId)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                  <strong>
                    {formatearPrecio(item.precio * item.cantidad)}
                  </strong>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sales-cart-summary">
        <div className="sales-subtotal">
          <span>Subtotal</span>
          <strong>{formatearPrecio(subtotal)}</strong>
        </div>
        <p className="sales-tax-note">
          Impuestos según configuración del negocio
        </p>
        <button
          className="sales-checkout-button"
          disabled={items.length === 0}
          onClick={onCobrar}
          type="button"
        >
          Registrar venta {items.length > 0 ? formatearPrecio(subtotal) : ""}
        </button>
        <p className="sales-demo-note">{notaVenta}</p>
      </div>
    </aside>
  );
}

export default CarritoVentas;
