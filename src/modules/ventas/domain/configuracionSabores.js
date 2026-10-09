export const MAX_CANTIDAD_SABORES = 6;

export function crearClaveLineaVenta(productoId, seleccion = []) {
  return JSON.stringify([productoId, [...seleccion].sort()]);
}

export function calcularCostoUnitarioVenta({ producto, productos, sabores = [] }) {
  const productoCatalogo = productos.find((item) => item.id === producto.id);
  if (!Number.isFinite(productoCatalogo?.costo)) return undefined;

  let costoTotal = productoCatalogo.costo;
  for (const seleccionado of sabores) {
    const id = typeof seleccionado === "string" ? seleccionado : seleccionado.productoId;
    const sabor = productos.find((item) => item.id === id);
    if (!Number.isFinite(sabor?.costo)) return undefined;
    costoTotal += sabor.costo;
  }
  return costoTotal;
}

export function calcularConsumoSabores(items, productos) {
  const productosPorId = new Map(
    productos.map((producto) => [producto.id, producto]),
  );
  const consumo = new Map();

  for (const item of items) {
    const seleccion = item.sabores?.map((sabor) => sabor.productoId) ?? [];
    const producto = productosPorId.get(item.productoId);
    const saboresConsumidos = seleccion.length > 0
      ? seleccion
      : producto?.controlaStock || producto?.esSabor
        ? [item.productoId]
        : [];

    for (const saborId of saboresConsumidos) {
      consumo.set(saborId, (consumo.get(saborId) ?? 0) + item.cantidad);
    }
  }

  return consumo;
}

export function normalizarConfiguracionVenta(configuracion) {
  if (configuracion === undefined || configuracion === null) return null;

  if (
    typeof configuracion !== "object" ||
    configuracion.tipo !== "sabores" ||
    !Number.isInteger(configuracion.cantidadSabores) ||
    configuracion.cantidadSabores < 1 ||
    configuracion.cantidadSabores > MAX_CANTIDAD_SABORES ||
    (configuracion.permitirRepetidos !== undefined &&
      typeof configuracion.permitirRepetidos !== "boolean")
  ) {
    throw new Error("La configuración de sabores del producto no es válida.");
  }

  return {
    tipo: "sabores",
    cantidadSabores: configuracion.cantidadSabores,
    permitirRepetidos: configuracion.permitirRepetidos ?? true,
  };
}

export function validarSeleccionSabores({
  producto,
  saboresDisponibles,
  seleccion,
  cantidadUnidades = 1,
}) {
  const configuracion = normalizarConfiguracionVenta(
    producto?.configuracionVenta,
  );

  if (!configuracion) {
    if (seleccion?.length) {
      throw new Error("Este producto no admite selección de sabores.");
    }
    return [];
  }

  if (!Number.isInteger(cantidadUnidades) || cantidadUnidades < 1) {
    throw new Error(
      "La cantidad del producto debe ser un entero mayor que cero.",
    );
  }

  if (
    !Array.isArray(seleccion) ||
    seleccion.length !== configuracion.cantidadSabores
  ) {
    throw new Error(
      `Selecciona exactamente ${configuracion.cantidadSabores} sabores.`,
    );
  }

  const sabores = new Map(
    saboresDisponibles
      .filter(
        (sabor) => sabor?.esSabor === true && typeof sabor.id === "string",
      )
      .map((sabor) => [sabor.id, sabor]),
  );

  if (seleccion.some((id) => typeof id !== "string" || !sabores.has(id))) {
    throw new Error("Uno de los sabores seleccionados ya no está disponible.");
  }

  if (
    !configuracion.permitirRepetidos &&
    new Set(seleccion).size !== seleccion.length
  ) {
    throw new Error("No se puede repetir el mismo sabor en este producto.");
  }

  const cantidadesPorSabor = new Map();
  for (const id of seleccion) {
    cantidadesPorSabor.set(
      id,
      (cantidadesPorSabor.get(id) ?? 0) + cantidadUnidades,
    );
  }

  for (const [id, cantidadNecesaria] of cantidadesPorSabor) {
    const stockDisponible = sabores.get(id).stockDisponible;
    if (!Number.isInteger(stockDisponible)) {
      throw new Error(
        `El sabor ${sabores.get(id).nombre} no tiene un conteo inicial de stock.`,
      );
    }
    if (stockDisponible < cantidadNecesaria) {
      throw new Error(
        `No hay suficientes porciones disponibles de ${sabores.get(id).nombre}.`,
      );
    }
  }

  return [...seleccion];
}

export function validarDisponibilidadSaboresEnCarrito({
  productos,
  carrito,
  seleccion,
  cantidadUnidades = 1,
}) {
  const productosPorId = new Map(
    productos.map((producto) => [producto.id, producto]),
  );
  const porcionesReservadas = new Map();

  for (const linea of carrito) {
    if ((linea.controlaStock || linea.esSabor) && !linea.configuracionVenta) {
      porcionesReservadas.set(
        linea.id,
        (porcionesReservadas.get(linea.id) ?? 0) + linea.cantidad,
      );
    }
    for (const sabor of linea.sabores ?? []) {
      porcionesReservadas.set(
        sabor.productoId,
        (porcionesReservadas.get(sabor.productoId) ?? 0) + linea.cantidad,
      );
    }
  }

  for (const id of seleccion) {
    porcionesReservadas.set(
      id,
      (porcionesReservadas.get(id) ?? 0) + cantidadUnidades,
    );
  }

  for (const [id, cantidadNecesaria] of porcionesReservadas) {
    const sabor = productosPorId.get(id);
    if (!(sabor?.controlaStock || sabor?.esSabor)) {
      throw new Error(
        "Uno de los sabores seleccionados ya no está disponible.",
      );
    }
    if (!Number.isInteger(sabor.stockDisponible)) {
      throw new Error(
        `${sabor.nombre} no tiene un conteo inicial de stock.`,
      );
    }
    if (sabor.stockDisponible < cantidadNecesaria) {
      throw new Error(
        sabor.esSabor
          ? `No hay suficientes porciones disponibles de ${sabor.nombre}.`
          : `No hay suficiente stock de ${sabor.nombre}.`,
      );
    }
  }
}
