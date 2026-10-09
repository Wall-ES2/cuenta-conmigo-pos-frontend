import { create } from "zustand";
import { categorias, productosIniciales } from "../data/productos.js";
import {
  guardarConfiguracionSincronizacion,
  solicitarSincronizacionEnSegundoPlano,
  ventasDatabase,
} from "../data/ventasDatabase.js";
import {
  obtenerEndpointSincronizacion,
  obtenerRutaSincronizacion,
  sincronizarVentasPendientes,
} from "../services/sincronizarVentas.js";
import { listarProductosApi } from "../../administracion/services/productosApi.js";
import {
  calcularConsumoSabores,
  crearClaveLineaVenta,
  validarDisponibilidadSaboresEnCarrito,
  normalizarConfiguracionVenta,
  validarSeleccionSabores,
} from "../domain/configuracionSabores.js";

const categoriasValidas = new Set([
  ...categorias.filter(({ id }) => id !== "todos").map(({ id }) => id),
  "cafeteria",
]);
const endpointSincronizacion = obtenerEndpointSincronizacion();
let inicializacionEnCurso;

function validarProducto(producto) {
  if (!producto || typeof producto !== "object") {
    throw new Error("Los datos del producto no son válidos.");
  }

  const nombre = producto.nombre?.trim();

  if (!nombre) {
    throw new Error("El producto debe tener un nombre.");
  }

  if (!categoriasValidas.has(producto.categoria)) {
    throw new Error("Selecciona una categoría válida para el producto.");
  }

  if (!Number.isFinite(producto.precio) || producto.precio <= 0) {
    throw new Error("El precio del producto debe ser mayor que cero.");
  }

  const esSabor = producto.esSabor ?? false;
  if (typeof esSabor !== "boolean") {
    throw new Error("La configuración de sabor del producto no es válida.");
  }

  const configuracionVenta = normalizarConfiguracionVenta(
    producto.configuracionVenta,
  );
  const controlaStock = producto.controlaStock ?? esSabor;
  if (typeof controlaStock !== "boolean") {
    throw new Error("La configuración de control de stock no es válida.");
  }
  if (esSabor && (producto.categoria !== "helados" || configuracionVenta)) {
    throw new Error(
      "Un sabor debe pertenecer a Helados y no puede ser configurable.",
    );
  }

  const stockDisponible = producto.stockDisponible;
  if (
    stockDisponible !== undefined &&
    stockDisponible !== null &&
    (!Number.isInteger(stockDisponible) || stockDisponible < 0)
  ) {
    throw new Error("La disponibilidad del sabor no es válida.");
  }
  if (
    (controlaStock || esSabor) && producto.stockMinimo !== undefined &&
    producto.stockMinimo !== null &&
    (!Number.isInteger(producto.stockMinimo) || producto.stockMinimo < 0)
  ) {
    throw new Error(
      "El mínimo de stock debe ser un entero igual o mayor que cero.",
    );
  }

  const imagenUrl = producto.imagenUrl?.trim() ?? "";
  if (imagenUrl) {
    let url;
    try {
      url = new URL(imagenUrl);
    } catch (error) {
      throw new Error("La URL de imagen debe ser un enlace HTTP o HTTPS.", {
        cause: error,
      });
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("La URL de imagen debe ser un enlace HTTP o HTTPS.");
    }
  }

  return {
    ...producto,
    nombre: (esSabor ? nombre.replace(/^helado(?:\s+de)?\s+/i, "") : nombre) || nombre,
    esSabor,
    configuracionVenta,
    controlaStock,
    stockDisponible: stockDisponible ?? undefined,
    detalle: producto.detalle?.trim() ?? "",
    imagenUrl,
  };
}

async function contarVentasPendientes() {
  return ventasDatabase.colaSincronizacion.count();
}

async function resumirColaSincronizacion() {
  const elementos = await ventasDatabase.colaSincronizacion.toArray();
  const bloqueada = elementos.find((elemento) => elemento.bloqueada);
  return {
    cantidad: elementos.length,
    bloqueada: Boolean(bloqueada),
    error: bloqueada?.ultimoError ?? "",
  };
}

export const useVentasStore = create((set, get) => ({
  productos: [...productosIniciales],
  carrito: [],
  inicializado: false,
  errorAlmacenamiento: "",
  errorServiceWorker: "",
  cantidadPendiente: 0,
  estadoSincronizacion: "sin-configurar",
  errorSincronizacion: "",
  errorCatalogoApi: "",
  guardandoVenta: false,

  inicializar: () => {
    if (inicializacionEnCurso) return inicializacionEnCurso;

    inicializacionEnCurso = (async () => {
      try {
        await ventasDatabase.open();
        await guardarConfiguracionSincronizacion(endpointSincronizacion);

        const [productosSinValidar, resumenCola] = await Promise.all([
          ventasDatabase.productos.toArray(),
          resumirColaSincronizacion(),
        ]);
        const productos = productosSinValidar.map(validarProducto);

        set({
          productos,
          cantidadPendiente: resumenCola.cantidad,
          inicializado: true,
          errorAlmacenamiento: "",
          estadoSincronizacion: resumenCola.bloqueada
            ? "requiere-intervencion"
            : endpointSincronizacion
              ? resumenCola.cantidad > 0
                ? "pendiente"
                : "sincronizada"
              : resumenCola.cantidad > 0
                ? "sin-configurar"
                : "sin-configurar",
          errorSincronizacion: resumenCola.error,
        });

        return true;
      } catch (error) {
        set({
          inicializado: false,
          errorAlmacenamiento:
            error instanceof Error
              ? error.message
              : "No se pudo inicializar el almacenamiento local.",
        });
        inicializacionEnCurso = undefined;
        throw error;
      }
    })();

    return inicializacionEnCurso;
  },

  cargarCatalogoDesdeApi: async () => {
    try {
      const productos = await listarProductosApi();
      const ventasPendientes = await ventasDatabase.ventas
        .where("estado")
        .equals("pendiente")
        .toArray();
      const consumoPendiente = calcularConsumoSabores(
        ventasPendientes.flatMap((venta) => venta.items),
        productos,
      );
      const productosPersistidos = productos.map((producto) => ({
        ...validarProducto(producto),
        id: producto.id,
        stockDisponible: Number.isInteger(producto.stockDisponible)
          ? Math.max(
              0,
              producto.stockDisponible -
                (consumoPendiente.get(producto.id) ?? 0),
            )
          : producto.stockDisponible,
        actualizadoEn: new Date().toISOString(),
      }));

      await ventasDatabase.transaction(
        "rw",
        ventasDatabase.productos,
        async () => {
          await ventasDatabase.productos.clear();
          if (productosPersistidos.length > 0) {
            await ventasDatabase.productos.bulkAdd(productosPersistidos);
          }
        },
      );

      set({ productos: productosPersistidos, errorCatalogoApi: "" });
      return productosPersistidos;
    } catch (error) {
      set({
        errorCatalogoApi:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catálogo desde el backend.",
      });
      throw error;
    }
  },

  agregarProductoCatalogo: async (producto) => {
    const nuevoProducto = validarProducto(producto);
    const id = nuevoProducto.id ?? globalThis.crypto.randomUUID();
    const productoPersistido = {
      ...nuevoProducto,
      id,
      actualizadoEn: new Date().toISOString(),
    };

    if (get().productos.some((item) => item.id === id)) {
      throw new Error(`Ya existe un producto con el identificador "${id}".`);
    }

    await ventasDatabase.productos.add(productoPersistido);
    set((state) => ({
      productos: [...state.productos, productoPersistido],
    }));
  },

  actualizarProductoCatalogo: async (id, cambios) => {
    const productoActual = get().productos.find(
      (producto) => producto.id === id,
    );

    if (!productoActual) {
      throw new Error(`No se encontró el producto "${id}".`);
    }

    const productoActualizado = validarProducto({
      ...productoActual,
      ...cambios,
      id,
      actualizadoEn: new Date().toISOString(),
    });

    await ventasDatabase.productos.put(productoActualizado);
    set((state) => ({
      productos: state.productos.map((producto) =>
        producto.id === id ? productoActualizado : producto,
      ),
    }));
  },

  eliminarProductoCatalogo: async (id) => {
    if (!get().productos.some((producto) => producto.id === id)) {
      throw new Error(`No se encontró el producto "${id}".`);
    }

    await ventasDatabase.productos.delete(id);
    set((state) => ({
      productos: state.productos.filter((producto) => producto.id !== id),
    }));
  },

  agregarAlCarrito: (id, seleccionSabores = []) => {
    const { productos } = get();
    const producto = productos.find((item) => item.id === id);

    if (!producto) {
      throw new Error(
        `No se puede agregar "${id}": el producto no está en el catálogo.`,
      );
    }

    const saboresIds = validarSeleccionSabores({
      producto,
      saboresDisponibles: productos,
      seleccion: seleccionSabores,
    });
    const sabores = saboresIds.map((saborId) => {
      const sabor = productos.find((item) => item.id === saborId);
      return { productoId: sabor.id, nombre: sabor.nombre };
    });
    const precioVenta = producto.precio;
    const lineId = crearClaveLineaVenta(id, saboresIds);
    const porcionesNuevas = producto.configuracionVenta
      ? saboresIds
      : producto.controlaStock
        ? [producto.id]
        : [];
    validarDisponibilidadSaboresEnCarrito({
      productos,
      carrito: get().carrito,
      seleccion: porcionesNuevas,
    });

    set((state) => {
      const lineaExistente = state.carrito.find(
        (item) => item.lineId === lineId,
      );

      return {
        carrito: lineaExistente
          ? state.carrito.map((item) =>
              item.lineId === lineId
                ? { ...item, cantidad: item.cantidad + 1 }
                : item,
            )
          : [...state.carrito, { ...producto, precio: precioVenta, cantidad: 1, lineId, sabores }],
      };
    });
  },

  editarLineaConfigurada: (lineId, seleccionSabores) => {
    const { productos, carrito } = get();
    const linea = carrito.find((item) => item.lineId === lineId);
    if (!linea?.configuracionVenta) throw new Error("No se encontró el cucurucho para editar.");
    const carritoRestante = carrito.filter((item) => item.lineId !== lineId);
    const saboresIds = validarSeleccionSabores({ producto: linea, saboresDisponibles: productos, seleccion: seleccionSabores, cantidadUnidades: linea.cantidad });
    validarDisponibilidadSaboresEnCarrito({ productos, carrito: carritoRestante, seleccion: saboresIds, cantidadUnidades: linea.cantidad });
    const sabores = saboresIds.map((id) => { const sabor = productos.find((item) => item.id === id); return { productoId: id, nombre: sabor.nombre }; });
    const nuevoLineId = crearClaveLineaVenta(linea.id, saboresIds);
    const precio = productos.find((item) => item.id === linea.id).precio;
    const actualizado = { ...linea, precio, sabores, lineId: nuevoLineId };
    set({ carrito: carritoRestante.some((item) => item.lineId === nuevoLineId)
      ? carritoRestante.map((item) => item.lineId === nuevoLineId ? { ...item, cantidad: item.cantidad + linea.cantidad } : item)
      : [...carritoRestante, actualizado] });
  },

  aumentarCantidad: (lineId) => {
    const linea = get().carrito.find(
      (item) => item.lineId === lineId || item.id === lineId,
    );
    if (!linea) return;

    const saboresLinea = linea.sabores?.map((sabor) => sabor.productoId) ?? [];
    if (linea.configuracionVenta) {
      validarSeleccionSabores({
        producto: linea,
        saboresDisponibles: get().productos,
        seleccion: saboresLinea,
      });
    }
    if (linea.controlaStock || linea.configuracionVenta) {
      validarDisponibilidadSaboresEnCarrito({
      productos: get().productos,
      carrito: get().carrito,
      seleccion:
          linea.controlaStock && !linea.configuracionVenta
            ? [linea.id]
            : saboresLinea,
      });
    }

    set((state) => ({
      carrito: state.carrito.map((item) =>
        item.lineId === lineId || item.id === lineId
          ? { ...item, cantidad: item.cantidad + 1 }
          : item,
      ),
    }));
  },

  disminuirCantidad: (lineId) => {
    set((state) => ({
      carrito: state.carrito
        .map((item) =>
          item.lineId === lineId || item.id === lineId
            ? { ...item, cantidad: item.cantidad - 1 }
            : item,
        )
        .filter((item) => item.cantidad > 0),
    }));
  },

  quitarDelCarrito: (lineId) => {
    set((state) => ({
      carrito: state.carrito.filter(
        (item) => item.lineId !== lineId && item.id !== lineId,
      ),
    }));
  },

  vaciarCarrito: () => set({ carrito: [] }),

  registrarVenta: async (metodoPago) => {
    const { carrito } = get();

    if (carrito.length === 0) {
      throw new Error("No se puede registrar una venta sin productos.");
    }

    if (get().guardandoVenta) {
      throw new Error("Ya se está guardando una venta.");
    }

    const productos = get().productos;
    const saboresAConsumir = [];
    for (const linea of carrito) {
      if (linea.controlaStock && !linea.configuracionVenta) {
        for (let unidad = 0; unidad < linea.cantidad; unidad += 1) {
          saboresAConsumir.push(linea.id);
        }
        continue;
      }
      if (!linea.configuracionVenta) continue;

      const seleccion = linea.sabores?.map((sabor) => sabor.productoId) ?? [];
      validarSeleccionSabores({
        producto: linea,
        saboresDisponibles: productos,
        seleccion,
        cantidadUnidades: linea.cantidad,
      });
      for (let unidad = 0; unidad < linea.cantidad; unidad += 1) {
        saboresAConsumir.push(...seleccion);
      }
    }
    validarDisponibilidadSaboresEnCarrito({
      productos,
      carrito: [],
      seleccion: saboresAConsumir,
    });

    const creadaEn = new Date().toISOString();
    const venta = {
      id: globalThis.crypto.randomUUID(),
      items: carrito.map(
        ({ id, nombre, categoria, precio, cantidad, sabores }) => ({
          productoId: id,
          nombre,
          categoria,
          precioUnitario: precio,
          cantidad,
          totalLinea: precio * cantidad,
          sabores: sabores ?? [],
        }),
      ),
      total: carrito.reduce(
        (total, item) => total + item.precio * item.cantidad,
        0,
      ),
      metodoPago,
      creadaEn,
      estado: "pendiente",
    };
    const consumoPorSabor = calcularConsumoSabores(venta.items, productos);

    set({ guardandoVenta: true });
    try {
      await ventasDatabase.transaction(
        "rw",
        ventasDatabase.ventas,
        ventasDatabase.colaSincronizacion,
        ventasDatabase.productos,
        async () => {
          for (const [saborId, cantidad] of consumoPorSabor) {
            const sabor = await ventasDatabase.productos.get(saborId);
            if (!(sabor?.controlaStock || sabor?.esSabor)) {
              throw new Error(
                `El sabor "${saborId}" ya no está disponible en el catálogo.`,
              );
            }
            if (!Number.isInteger(sabor.stockDisponible) || sabor.stockDisponible < cantidad) {
              throw new Error(`No hay suficiente stock disponible de ${sabor.nombre}.`);
            }
            await ventasDatabase.productos.update(saborId, {
              stockDisponible: sabor.stockDisponible - cantidad,
            });
          }
          await ventasDatabase.ventas.add(venta);
          await ventasDatabase.colaSincronizacion.add({
            id: venta.id,
            creadaEn,
            intentos: 0,
            reclamoHasta: 0,
          });
        },
      );
    } catch (error) {
      set({ guardandoVenta: false });
      throw error;
    }

    const cantidadPendiente = get().cantidadPendiente + 1;
    set({
      carrito: [],
      productos: get().productos.map((producto) => {
        const cantidad = consumoPorSabor.get(producto.id);
        return Number.isInteger(producto.stockDisponible) && cantidad
          ? {
              ...producto,
              stockDisponible: producto.stockDisponible - cantidad,
            }
          : producto;
      }),
      guardandoVenta: false,
      cantidadPendiente,
      estadoSincronizacion: endpointSincronizacion
        ? "pendiente"
        : "sin-configurar",
      errorSincronizacion: "",
    });

    if (endpointSincronizacion) {
      try {
        await solicitarSincronizacionEnSegundoPlano();
      } catch (error) {
        set({
          errorSincronizacion:
            error instanceof Error
              ? `No se pudo programar la sincronización en segundo plano: ${error.message}`
              : "No se pudo programar la sincronización en segundo plano.",
        });
      }

      if (navigator.onLine) await get().sincronizarPendientes();
    }

    return venta;
  },

  sincronizarPendientes: async () => {
    if (!endpointSincronizacion) {
      set({ estadoSincronizacion: "sin-configurar" });
      return { estado: "esperando-configuracion", sincronizadas: 0 };
    }

    set({ estadoSincronizacion: "sincronizando", errorSincronizacion: "" });

    try {
      const resultado = await sincronizarVentasPendientes({
        endpoint: obtenerRutaSincronizacion(),
      });
      const cantidadPendiente = await contarVentasPendientes();

      set({
        cantidadPendiente,
        estadoSincronizacion: resultado.estado,
        errorSincronizacion: resultado.error ?? "",
      });

      return resultado;
    } catch (error) {
      set({
        cantidadPendiente: await contarVentasPendientes(),
        estadoSincronizacion: "error",
        errorSincronizacion:
          error instanceof Error
            ? error.message
            : "No se pudieron sincronizar las ventas pendientes.",
      });
      throw error;
    }
  },

  reintentarVentasBloqueadas: async () => {
    await ventasDatabase.transaction(
      "rw",
      ventasDatabase.colaSincronizacion,
      async () => {
        const bloqueadas = await ventasDatabase.colaSincronizacion
          .filter((item) => item.bloqueada === true)
          .toArray();
        await Promise.all(
          bloqueadas.map((item) =>
            ventasDatabase.colaSincronizacion.update(item.id, {
              bloqueada: false,
              codigoError: undefined,
              ultimoError: "",
              reclamoHasta: 0,
            }),
          ),
        );
      },
    );
    return get().sincronizarPendientes();
  },

  refrescarColaSincronizacion: async () => {
    const resumenCola = await resumirColaSincronizacion();
    set({
      cantidadPendiente: resumenCola.cantidad,
      estadoSincronizacion: resumenCola.bloqueada
        ? "requiere-intervencion"
        : resumenCola.cantidad > 0
          ? endpointSincronizacion
            ? "pendiente"
            : "sin-configurar"
          : endpointSincronizacion
            ? "sincronizada"
            : "sin-configurar",
      errorSincronizacion: resumenCola.error,
    });
  },

  informarErrorServiceWorker: (error) => {
    set({
      errorServiceWorker:
        error instanceof Error
          ? error.message
          : "No se pudo habilitar el modo offline de la aplicación.",
    });
  },
}));
