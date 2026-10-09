import { useEffect, useMemo, useState } from "react";
import {
  categorias,
  formatearPrecio,
} from "../modules/ventas/data/productos.js";
import {
  crearCategoriaCatalogo,
  eliminarCategoriasCatalogo,
  listarCategoriasEliminables,
  listarCategoriasProductos,
  listarCategoriasSabores,
} from "../modules/administracion/services/categoriasCatalogo.js";
import { metodosPago } from "../modules/ventas/data/metodosPago.js";
import CarritoVentas from "../modules/ventas/components/CarritoVentas.jsx";
import ConfiguradorSaboresModal from "../modules/ventas/components/ConfiguradorSaboresModal.jsx";
import ProductoCard from "../modules/ventas/components/ProductoCard.jsx";
import {
  crearClaveLineaVenta,
  validarDisponibilidadSaboresEnCarrito,
  validarSeleccionSabores,
} from "../modules/ventas/domain/configuracionSabores.js";
import TendenciaVentas from "../modules/financiero/components/TendenciaVentas.jsx";
import TarjetaIndicador from "../modules/financiero/components/TarjetaIndicador.jsx";
import { calcularReporteVentas } from "../modules/financiero/services/reportesVentas.js";
import "./preview.css";
import "../modules/ventas/ventas.css";

const navegacion = [
  { id: "inicio", nombre: "Inicio", iniciales: "IN" },
  { id: "ventas", nombre: "Ventas", iniciales: "VE" },
  { id: "inventario", nombre: "Inventario", iniciales: "IV" },
  { id: "financiero", nombre: "Financiero", iniciales: "FI" },
  { id: "administracion", nombre: "Administración", iniciales: "AD" },
];

const productosDemo = [
  {
    id: "demo-sabor-vainilla",
    nombre: "Vainilla",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 8,
    stockMinimo: 3,
    categoriaSabor: "cremas",
  },
  {
    id: "demo-sabor-chocolate",
    nombre: "Chocolate",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 6,
    stockMinimo: 3,
    categoriaSabor: "chocolates",
  },
  {
    id: "demo-sabor-chocolate-almendras",
    nombre: "Chocolate con almendras",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 5,
    stockMinimo: 2,
    categoriaSabor: "chocolates",
  },
  {
    id: "demo-sabor-chocolate-blanco",
    nombre: "Chocolate blanco",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 4,
    stockMinimo: 2,
    categoriaSabor: "chocolates",
  },
  {
    id: "demo-sabor-frutilla",
    nombre: "Frutilla",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 9,
    stockMinimo: 3,
    categoriaSabor: "frutales",
  },
  {
    id: "demo-sabor-naranja",
    nombre: "Naranja",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 6,
    stockMinimo: 2,
    categoriaSabor: "frutales",
  },
  {
    id: "demo-sabor-limon",
    nombre: "Limón",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 3,
    stockMinimo: 3,
    categoriaSabor: "frutales",
  },
  {
    id: "demo-sabor-dulce-leche",
    nombre: "Dulce de leche",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 10,
    stockMinimo: 4,
    categoriaSabor: "cremas",
  },
  {
    id: "demo-sabor-menta",
    nombre: "Menta granizada",
    categoria: "helados",
    precio: 1,
    detalle: "Sabor de helado",
    imagenUrl: "",
    esSabor: true,
    controlaStock: true,
    stockDisponible: 4,
    stockMinimo: 2,
    categoriaSabor: "especiales",
  },
  {
    id: "demo-cucurucho",
    nombre: "Cucurucho doble",
    categoria: "helados",
    precio: 2500,
    detalle: "Cucurucho · doble",
    imagenUrl: "",
    configuracionVenta: {
      tipo: "sabores",
      cantidadSabores: 2,
      permitirRepetidos: true,
    },
  },
  {
    id: "demo-cucurucho-simple",
    nombre: "Cucurucho simple",
    categoria: "helados",
    precio: 1800,
    detalle: "Un sabor a elección",
    imagenUrl: "",
    configuracionVenta: { tipo: "sabores", cantidadSabores: 1, permitirRepetidos: true },
  },
  {
    id: "demo-cucurucho-triple",
    nombre: "Cucurucho triple bañado",
    categoria: "helados",
    precio: 3300,
    detalle: "Tres sabores, bañado en chocolate",
    imagenUrl: "",
    configuracionVenta: { tipo: "sabores", cantidadSabores: 3, permitirRepetidos: true },
  },
  {
    id: "demo-facturas",
    nombre: "Facturas",
    categoria: "panaderia",
    precio: 750,
    detalle: "Unidad",
    imagenUrl: "",
    controlaStock: true,
    stockDisponible: 18,
    stockMinimo: 5,
  },
  {
    id: "demo-cafe",
    nombre: "Café latte",
    categoria: "cafeteria",
    precio: 2200,
    controlaStock: true,
    stockDisponible: 12,
    stockMinimo: 3,
    detalle: "Tamaño regular",
    imagenUrl: "",
  },
  {
    id: "demo-capuccino",
    nombre: "Capuccino",
    categoria: "cafeteria",
    precio: 2400,
    controlaStock: true,
    stockDisponible: 10,
    stockMinimo: 3,
    detalle: "Tamaño regular",
    imagenUrl: "",
  },
  {
    id: "demo-croissant",
    nombre: "Croissant",
    categoria: "panaderia",
    precio: 1600,
    controlaStock: true,
    stockDisponible: 14,
    stockMinimo: 4,
    detalle: "Recién horneado",
    imagenUrl: "",
  },
  {
    id: "demo-medialuna",
    nombre: "Medialuna",
    categoria: "panaderia",
    precio: 900,
    controlaStock: true,
    stockDisponible: 20,
    stockMinimo: 5,
    detalle: "Unidad",
    imagenUrl: "",
  },
  {
    id: "demo-licuado-frutilla",
    nombre: "Licuado de frutilla",
    categoria: "licuados",
    precio: 2800,
    detalle: "Vaso grande",
    imagenUrl: "",
    controlaStock: true,
    stockDisponible: 12,
    stockMinimo: 4,
  },
  {
    id: "demo-licuado-banana",
    nombre: "Licuado de banana",
    categoria: "licuados",
    precio: 2600,
    detalle: "Vaso grande",
    imagenUrl: "",
    controlaStock: true,
    stockDisponible: 2,
    stockMinimo: 4,
  },
  {
    id: "demo-te-negro",
    nombre: "Té negro",
    categoria: "infusiones",
    precio: 1400,
    detalle: "Taza",
    imagenUrl: "",
    controlaStock: true,
    stockDisponible: 15,
    stockMinimo: 5,
  },
  {
    id: "demo-mate-cocido",
    nombre: "Mate cocido",
    categoria: "infusiones",
    precio: 1200,
    detalle: "Taza",
    imagenUrl: "",
    controlaStock: true,
    stockDisponible: 0,
    stockMinimo: 4,
  },
  {
    id: "demo-limonada",
    nombre: "Limonada",
    categoria: "bebidas",
    precio: 1700,
    detalle: "Jarra individual",
    imagenUrl: "",
    controlaStock: true,
    stockDisponible: 8,
    stockMinimo: 3,
  },
  {
    id: "demo-jugo-naranja",
    nombre: "Jugo de naranja",
    categoria: "bebidas",
    precio: 1900,
    detalle: "Vaso exprimido",
    imagenUrl: "",
    controlaStock: true,
    stockDisponible: 1,
    stockMinimo: 3,
  },
  {
    id: "demo-agua",
    nombre: "Agua mineral",
    categoria: "bebidas",
    precio: 1200,
    controlaStock: true,
    stockDisponible: 9,
    stockMinimo: 3,
    detalle: "Botella 500 ml",
    imagenUrl: "",
  },
];

const usuariosDemoIniciales = [
  {
    id: "demo-admin",
    nombre: "María González",
    email: "maria@demo.local",
    rol: "Administrador",
  },
  {
    id: "demo-cajero",
    nombre: "Juan Pérez",
    email: "juan@demo.local",
    rol: "Cajero",
  },
];

const formularioProductoDemoVacio = {
  nombre: "",
  categoria: "helados",
  precio: "",
  detalle: "",
  imagenUrl: "",
  esSabor: false,
  categoriaSabor: "",
  tipoCucurucho: false,
  configurarSabores: false,
  cantidadSabores: "1",
  stockMinimo: "3",
};

const categoriaNombre = Object.fromEntries(
  categorias.map(({ id, nombre }) => [id, nombre]),
);

function crearVentasDemo() {
  const hoy = new Date();
  const fecha = (diasAtras, hora) => {
    const valor = new Date(hoy);
    valor.setDate(valor.getDate() - diasAtras);
    valor.setHours(hora, 30, 0, 0);
    return valor.toISOString();
  };

  return [
    ventaDemo("demo-venta-1", fecha(0, 10), "Tarjeta", [
      {
        nombre: "Café latte",
        categoria: "cafeteria",
        cantidad: 2,
        totalLinea: 4400,
      },
      {
        nombre: "Croissant",
        categoria: "panaderia",
        cantidad: 1,
        totalLinea: 1600,
      },
    ]),
    ventaDemo(
      "demo-venta-2",
      fecha(0, 12),
      "Efectivo",
      [
        {
          nombre: "Cucurucho simple",
          categoria: "helados",
          cantidad: 2,
          totalLinea: 3600,
          sabores: [{ productoId: "demo-sabor-vainilla", nombre: "Vainilla" }],
        },
      ],
      "pendiente",
    ),
    ventaDemo("demo-venta-3", fecha(1, 11), "Efectivo", [
      {
        nombre: "Capuccino",
        categoria: "cafeteria",
        cantidad: 1,
        totalLinea: 2400,
      },
      {
        nombre: "Medialuna",
        categoria: "panaderia",
        cantidad: 2,
        totalLinea: 1800,
      },
    ]),
    ventaDemo("demo-venta-4", fecha(2, 14), "Transferencia", [
      {
        nombre: "Cucurucho doble",
        categoria: "helados",
        cantidad: 2,
        totalLinea: 5000,
        sabores: [
          { productoId: "demo-sabor-vainilla", nombre: "Vainilla" },
          { productoId: "demo-sabor-chocolate", nombre: "Chocolate" },
        ],
      },
    ]),
    ventaDemo("demo-venta-5", fecha(4, 16), "Tarjeta", [
      {
        nombre: "Cucurucho simple",
        categoria: "helados",
        cantidad: 2,
        totalLinea: 3800,
        sabores: [{ productoId: "demo-sabor-chocolate", nombre: "Chocolate" }],
      },
      {
        nombre: "Agua mineral",
        categoria: "otros",
        cantidad: 1,
        totalLinea: 1200,
      },
    ]),
    ventaDemo("demo-venta-6", fecha(6, 13), "Efectivo", [
      {
        nombre: "Café latte",
        categoria: "cafeteria",
        cantidad: 1,
        totalLinea: 2200,
      },
      {
        nombre: "Croissant",
        categoria: "panaderia",
        cantidad: 1,
        totalLinea: 1600,
      },
    ]),
  ];
}

function ventaDemo(id, creadaEn, metodoPago, items, estado = "sincronizada") {
  return {
    id,
    creadaEn,
    metodoPago,
    estado,
    items,
    total: items.reduce((total, item) => total + item.totalLinea, 0),
  };
}

function PreviewPage() {
  const [seccion, setSeccion] = useState("inicio");
  const [rolActivo, setRolActivo] = useState("Administrador");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarColapsado, setSidebarColapsado] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [ventas, setVentas] = useState(crearVentasDemo);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [productoConfigurando, setProductoConfigurando] = useState(null);
  const [lineaEditando, setLineaEditando] = useState(null);
  const [aviso, setAviso] = useState("");
  const [productos, setProductos] = useState(productosDemo);
  const [usuariosDemo, setUsuariosDemo] = useState(usuariosDemoIniciales);
  const [periodo, setPeriodo] = useState(7);
  const [fechaEspecifica, setFechaEspecifica] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const navegacionVisible =
    rolActivo === "Administrador"
      ? navegacion
      : navegacion.filter(({ id }) =>
          ["inicio", "ventas", "inventario"].includes(id),
        );
  const subtotal = carrito.reduce(
    (total, item) => total + item.precio * item.cantidad,
    0,
  );

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    return productos.filter(
      (producto) =>
        !producto.esSabor &&
        (categoriaActiva === "todos" ||
          producto.categoria === categoriaActiva) &&
        producto.nombre.toLocaleLowerCase("es").includes(termino),
    );
  }, [busqueda, categoriaActiva, productos]);

  const reporte = useMemo(() => {
    const rangoValido = fechaDesde && fechaHasta && fechaDesde <= fechaHasta;
    const fechaFin = fechaHasta || fechaDesde || fechaEspecifica;
    const diasRango =
      fechaDesde && fechaHasta && rangoValido
        ? Math.floor(
            (Date.parse(fechaHasta + "T12:00:00") -
              Date.parse(fechaDesde + "T12:00:00")) /
              86400000,
          ) + 1
        : fechaDesde || fechaHasta
          ? 1
          : 0;
    const fechaBase = fechaFin ? new Date(fechaFin + "T12:00:00") : new Date();
    if (!fechaFin && periodo === 0) fechaBase.setDate(fechaBase.getDate() - 1);
    return calcularReporteVentas(
      ventas,
      fechaBase,
      diasRango || (fechaEspecifica ? 1 : periodo === 0 ? 1 : periodo),
    );
  }, [fechaDesde, fechaHasta, fechaEspecifica, periodo, ventas]);

  function agregarAlCarrito(producto, seleccionSabores = []) {
    const saboresIds = validarSeleccionSabores({
      producto,
      saboresDisponibles: productos,
      seleccion: seleccionSabores,
    });
    const porcionesNuevas = producto.configuracionVenta
      ? saboresIds
      : producto.controlaStock
        ? [producto.id]
        : [];
    validarDisponibilidadSaboresEnCarrito({
      productos,
      carrito,
      seleccion: porcionesNuevas,
    });
    const lineId = crearClaveLineaVenta(producto.id, saboresIds);
    const sabores = saboresIds.map((saborId) => {
      const sabor = productos.find((item) => item.id === saborId);
      return { productoId: sabor.id, nombre: sabor.nombre };
    });
    const precioVenta = producto.precio;

    setCarrito((actual) => {
      const existe = actual.find((item) => item.lineId === lineId);
      return existe
        ? actual.map((item) =>
            item.lineId === lineId
              ? { ...item, cantidad: item.cantidad + 1 }
              : item,
          )
        : [
            ...actual,
            { ...producto, precio: precioVenta, cantidad: 1, lineId, sabores },
          ];
    });
  }

  function elegirProducto(producto) {
    setAviso("");
    if (producto.configuracionVenta) {
      setProductoConfigurando(producto);
      return;
    }

    try {
      agregarAlCarrito(producto);
    } catch (errorAlAgregar) {
      setAviso(
        errorAlAgregar instanceof Error
          ? errorAlAgregar.message
          : "No se pudo agregar el producto al carrito.",
      );
    }
  }

  function confirmarSabores(seleccion) {
    if (lineaEditando) {
      const linea = lineaEditando;
      const restante = carrito.filter((item) => item.lineId !== linea.lineId);
      validarDisponibilidadSaboresEnCarrito({
        productos,
        carrito: restante,
        seleccion,
        cantidadUnidades: linea.cantidad,
      });
      const sabores = seleccion.map((id) => {
        const sabor = productos.find((item) => item.id === id);
        return { productoId: id, nombre: sabor.nombre };
      });
      const lineId = crearClaveLineaVenta(linea.id, seleccion);
      const precio = productos.find((item) => item.id === linea.id).precio;
      const existe = restante.some((item) => item.lineId === lineId);
      setCarrito(
        existe
          ? restante.map((item) =>
              item.lineId === lineId
                ? { ...item, cantidad: item.cantidad + linea.cantidad }
                : item,
            )
          : [...restante, { ...linea, lineId, precio, sabores }],
      );
    } else {
      agregarAlCarrito(productoConfigurando, seleccion);
    }
    setProductoConfigurando(null);
    setLineaEditando(null);
  }

  function actualizarCantidad(lineId, incremento) {
    const linea = carrito.find(
      (item) => item.lineId === lineId || item.id === lineId,
    );
    if (!linea) return;

    if (incremento > 0 && (linea.controlaStock || linea.sabores?.length)) {
      try {
        const saboresLinea =
          linea.sabores?.map((sabor) => sabor.productoId) ?? [];
        if (linea.configuracionVenta) {
          validarSeleccionSabores({
            producto: linea,
            saboresDisponibles: productos,
            seleccion: saboresLinea,
          });
        }
        validarDisponibilidadSaboresEnCarrito({
          productos,
          carrito,
          seleccion:
            linea.controlaStock && !linea.configuracionVenta
              ? [linea.id]
              : saboresLinea,
        });
      } catch (errorCantidad) {
        setAviso(
          errorCantidad instanceof Error
            ? errorCantidad.message
            : "No se pudo aumentar la cantidad por disponibilidad de sabores.",
        );
        return;
      }
    }

    setCarrito((actual) =>
      actual
        .map((item) =>
          item.lineId === lineId || item.id === lineId
            ? { ...item, cantidad: item.cantidad + incremento }
            : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  }

  function confirmarVenta() {
    try {
      const saboresAConsumir = [];
      for (const item of carrito) {
        if (item.controlaStock && !item.configuracionVenta) {
          for (let unidad = 0; unidad < item.cantidad; unidad += 1) {
            saboresAConsumir.push(item.id);
          }
          continue;
        }
        const seleccion = item.sabores?.map((sabor) => sabor.productoId) ?? [];
        if (item.configuracionVenta) {
          validarSeleccionSabores({
            producto: item,
            saboresDisponibles: productos,
            seleccion,
          });
          for (let unidad = 0; unidad < item.cantidad; unidad += 1) {
            saboresAConsumir.push(...seleccion);
          }
        }
      }
      validarDisponibilidadSaboresEnCarrito({
        productos,
        carrito: [],
        seleccion: saboresAConsumir,
      });
    } catch (errorVenta) {
      setAviso(
        errorVenta instanceof Error
          ? errorVenta.message
          : "No se pudo confirmar la disponibilidad de sabores.",
      );
      return;
    }

    const items = carrito.map((item) => {
      const sabores = item.sabores ?? [];
      return {
        productoId: item.id,
        nombre: item.nombre,
        categoria: item.categoria,
        cantidad: item.cantidad,
        totalLinea: item.precio * item.cantidad,
        sabores,
      };
    });
    const porcionesVendidas = new Map();
    for (const item of carrito) {
      if (item.controlaStock && !item.configuracionVenta) {
        porcionesVendidas.set(
          item.id,
          (porcionesVendidas.get(item.id) ?? 0) + item.cantidad,
        );
      }
      for (const sabor of item.sabores ?? []) {
        porcionesVendidas.set(
          sabor.productoId,
          (porcionesVendidas.get(sabor.productoId) ?? 0) + item.cantidad,
        );
      }
    }
    setProductos((actuales) =>
      actuales.map((producto) =>
        Number.isFinite(producto.stockDisponible) &&
        porcionesVendidas.has(producto.id)
          ? {
              ...producto,
              stockDisponible:
                producto.stockDisponible - porcionesVendidas.get(producto.id),
            }
          : producto,
      ),
    );
    setVentas((actuales) => [
      ventaDemo(
        `demo-${globalThis.crypto.randomUUID()}`,
        new Date().toISOString(),
        metodoPago,
        items,
        "pendiente",
      ),
      ...actuales,
    ]);
    setCarrito([]);
    setMostrarCobro(false);
    setAviso("Venta demostrativa registrada. No se guardó en el sistema.");
  }

  function cambiarRolDemo(rol) {
    setRolActivo(rol);
    setAviso("");
    if (
      rol === "Cajero" &&
      ["financiero", "administracion"].includes(seccion)
    ) {
      setSeccion("inicio");
    }
  }

  return (
    <div className="preview-app">
      {sidebarVisible && (
        <aside
          className={`preview-sidebar ${sidebarColapsado ? "preview-sidebar-collapsed" : ""}`}
        >
          <div className="preview-brand">
            {!sidebarColapsado && (
              <div className="preview-brand-copy">
                <strong>Cuenta Conmigo</strong>
                <span>Sistema POS</span>
              </div>
            )}
            <button
              aria-label={
                sidebarColapsado ? "Expandir navegación" : "Colapsar navegación"
              }
              className="preview-collapse-button"
              onClick={() => setSidebarColapsado((actual) => !actual)}
              type="button"
            >
              {sidebarColapsado ? ">>" : "<<"}
            </button>
          </div>
          <nav
            aria-label="Secciones de demostración"
            className="preview-navigation"
          >
            {navegacionVisible.map((item) => (
              <button
                aria-current={seccion === item.id ? "page" : undefined}
                aria-label={item.nombre}
                className={`preview-nav-link ${seccion === item.id ? "preview-nav-active" : ""}`}
                key={item.id}
                onClick={() => {
                  setSeccion(item.id);
                  setAviso("");
                }}
                title={sidebarColapsado ? item.nombre : undefined}
                type="button"
              >
                {sidebarColapsado ? (
                  item.iniciales
                ) : (
                  <>
                    <span className="preview-nav-name">{item.nombre}</span>
                    <span aria-hidden="true" className="preview-nav-initials">
                      {item.iniciales}
                    </span>
                  </>
                )}
              </button>
            ))}
          </nav>
          <div className="preview-sidebar-footer">
            <span>Modo demostración</span>
            <strong>{rolActivo}</strong>
          </div>
        </aside>
      )}

      <div className="preview-main">
        <header className="preview-topbar">
          <div className="preview-topbar-actions">
            <button
              className="preview-secondary-button"
              onClick={() => setSidebarVisible((actual) => !actual)}
              type="button"
            >
              {sidebarVisible ? "Ocultar barra" : "Mostrar barra"}
            </button>
            <span className="preview-online-status">
              <span aria-hidden="true" />
              Con conexión
            </span>
          </div>
          <div className="preview-user-controls">
            <label htmlFor="demo-role">Vista de prueba</label>
            <select
              aria-label="Cambiar rol de demostración"
              id="demo-role"
              onChange={(event) => cambiarRolDemo(event.target.value)}
              value={rolActivo}
            >
              <option value="Administrador">Administrador</option>
              <option value="Cajero">Empleado</option>
            </select>
          </div>
        </header>

        <div className="preview-content">
          <div className="preview-disclaimer" role="status">
            <strong>Vista previa demostrativa.</strong>
            <span>
              Datos ficticios; las acciones no modifican ventas, catálogo, ni
              backend.
            </span>
          </div>
          {aviso && (
            <p className="preview-action-notice" role="status">
              {aviso}
            </p>
          )}

          {seccion === "inicio" && (
            <InicioDemo rolActivo={rolActivo} seleccionarSeccion={setSeccion} />
          )}
          {seccion === "ventas" && (
            <section className="sales-page">
              <header className="sales-header">
                <div>
                  <h1>Ventas</h1>
                  <p>Selecciona productos y prepara el pedido.</p>
                </div>
                <span className="sales-day-label">
                  Punto de venta de prueba
                </span>
              </header>
              <div className="sales-layout">
                <section
                  aria-label="Catálogo de productos"
                  className="sales-catalog"
                >
                  <div className="sales-toolbar">
                    <div>
                      <h2>Productos</h2>
                      <p>Selecciona un producto para agregar a la venta.</p>
                    </div>
                    <input
                      aria-label="Buscar productos"
                      className="sales-search"
                      onChange={(event) => setBusqueda(event.target.value)}
                      placeholder="Buscar producto..."
                      type="search"
                      value={busqueda}
                    />
                  </div>
                  <div
                    aria-label="Filtrar por categoría"
                    className="sales-categories"
                  >
                    {[{ id: "todos", nombre: "Todos" }, ...listarCategoriasProductos()].map((categoria) => (
                      <button
                        aria-pressed={categoriaActiva === categoria.id}
                        className="sales-category-button"
                        key={categoria.id}
                        onClick={() => setCategoriaActiva(categoria.id)}
                        type="button"
                      >
                        {categoria.nombre}
                      </button>
                    ))}
                  </div>
                  <div className="sales-product-grid">
                    {productosFiltrados.length ? (
                      productosFiltrados.map((producto) => (
                        <ProductoCard
                          key={producto.id}
                          onAgregar={elegirProducto}
                          producto={producto}
                        />
                      ))
                    ) : (
                      <div className="sales-no-results">
                        No se encontraron productos.
                      </div>
                    )}
                  </div>
                </section>
                <CarritoVentas
                  items={carrito}
                  onAumentar={(id) => actualizarCantidad(id, 1)}
                  onCobrar={() => setMostrarCobro(true)}
                  onDisminuir={(id) => actualizarCantidad(id, -1)}
                  onQuitar={(lineId) =>
                    setCarrito((actual) =>
                      actual.filter(
                        (item) => item.lineId !== lineId && item.id !== lineId,
                      ),
                    )
                  }
                  onVaciar={() => setCarrito([])}
                  onEditar={(linea) => {
                    setProductoConfigurando(linea);
                    setLineaEditando(linea);
                  }}
                  notaVenta="La operación de demostración no se guarda."
                  subtotal={subtotal}
                />
              </div>
            </section>
          )}
          {seccion === "inventario" && (
            <InventarioDemo productos={productos} rol={rolActivo} setProductos={setProductos} />
          )}
          {seccion === "financiero" && (
            <FinancieroDemo
              fechaEspecifica={fechaEspecifica}
              fechaDesde={fechaDesde}
              fechaHasta={fechaHasta}
              periodo={periodo}
              reporte={reporte}
              seleccionarDia={(clave) => {
                setFechaDesde("");
                setFechaHasta("");
                setFechaEspecifica((actual) => (actual === clave ? "" : clave));
              }}
              cambiarFechaDesde={(valor) => {
                setFechaEspecifica("");
                setFechaDesde(valor);
              }}
              cambiarFechaHasta={(valor) => {
                setFechaEspecifica("");
                setFechaHasta(valor);
              }}
              seleccionarPeriodo={(valor) => {
                setFechaEspecifica("");
                setFechaDesde("");
                setFechaHasta("");
                setPeriodo(valor);
              }}
            />
          )}
          {seccion === "administracion" && (
            <AdministracionDemo
              productos={productos}
              setProductos={setProductos}
              usuarios={usuariosDemo}
              setUsuarios={setUsuariosDemo}
            />
          )}
        </div>
      </div>

      {productoConfigurando && (
        <ConfiguradorSaboresModal
          onCancelar={() => {
            setProductoConfigurando(null);
            setLineaEditando(null);
          }}
          onConfirmar={confirmarSabores}
          producto={productoConfigurando}
          lineaEditando={lineaEditando}
          carrito={carrito}
          saboresDisponibles={productos}
        />
      )}

      {mostrarCobro && (
        <div className="sales-modal-backdrop" role="presentation">
          <section
            aria-labelledby="preview-payment-title"
            aria-modal="true"
            className="sales-modal"
            role="dialog"
          >
            <h2 id="preview-payment-title">Confirmar venta demostrativa</h2>
            <p>Esta operación solo actualiza la vista previa temporal.</p>
            <div aria-label="Medio de pago" className="sales-payment-methods">
              {metodosPago.map((medio) => (
                <button
                  aria-pressed={metodoPago === medio}
                  className="sales-payment-method"
                  key={medio}
                  onClick={() => setMetodoPago(medio)}
                  type="button"
                >
                  {medio}
                </button>
              ))}
            </div>
            <div className="sales-modal-total">
              <span>Total</span>
              <strong>{formatearPrecio(subtotal)}</strong>
            </div>
            <div className="sales-modal-actions">
              <button
                className="sales-modal-cancel"
                onClick={() => setMostrarCobro(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="sales-modal-confirm"
                onClick={confirmarVenta}
                type="button"
              >
                Confirmar demo
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function InicioDemo({ rolActivo, seleccionarSeccion }) {
  const accesos = [
    {
      id: "ventas",
      titulo: "Punto de venta",
      descripcion: "Inicia una venta y prepara el pedido.",
      accion: "Ir a ventas",
    },
    {
      id: "inventario",
      titulo: "Inventario",
      descripcion: "Consulta y administra las existencias.",
      accion: "Ver inventario",
    },
    {
      id: "financiero",
      titulo: "Financiero",
      descripcion: "Revisa los reportes e indicadores del negocio.",
      accion: "Ver reportes",
    },
    {
      id: "administracion",
      titulo: "Administración",
      descripcion: "Gestiona productos y cuentas de usuario.",
      accion: "Administrar",
    },
  ].filter(
    ({ id }) =>
      rolActivo === "Administrador" || ["ventas", "inventario"].includes(id),
  );

  return (
    <section className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-10 md:px-10 md:py-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            Cuenta Conmigo POS
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Bienvenido, María González
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Nos alegra tenerte aquí. Desde este espacio puedes acceder a las
            herramientas de tu jornada.
          </p>
          <span className="mt-5 inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-medium text-emerald-900">
            {rolActivo}
          </span>
        </div>
        <div className="p-6 md:p-10">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Accesos rápidos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Selecciona una sección para continuar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {accesos.map((acceso) => (
              <button
                className="group rounded-xl border border-slate-200 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                key={acceso.id}
                onClick={() => seleccionarSeccion(acceso.id)}
                type="button"
              >
                <span className="block font-semibold text-slate-900">
                  {acceso.titulo}
                </span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  {acceso.descripcion}
                </span>
                <span className="mt-5 inline-block text-sm font-semibold text-emerald-800 group-hover:underline">
                  {acceso.accion}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResumenIndicadores({
  periodo,
  reporte,
  fechaEspecifica,
  fechaDesde,
  fechaHasta,
  categoriaGrafico,
}) {
  const categoriaSeleccionada =
    categoriaNombre[categoriaGrafico] ?? categoriaGrafico;
  const totalVendidoSeleccionado =
    categoriaGrafico === "todas"
      ? reporte.totalFacturado
      : (reporte.porCategoria.find((item) => item.nombre === categoriaGrafico)
          ?.total ?? 0);
  const datosCategoriaSeleccionada = reporte.porCategoria.find(
    (item) => item.nombre === categoriaGrafico,
  );
  const ventasRegistradasSeleccionadas =
    categoriaGrafico === "todas"
      ? reporte.cantidadVentas
      : (datosCategoriaSeleccionada?.cantidadVentas ?? 0);
  const unidadesVendidasSeleccionadas =
    categoriaGrafico === "todas"
      ? reporte.unidadesVendidas
      : (datosCategoriaSeleccionada?.cantidad ?? 0);
  const promedioSeleccionado = ventasRegistradasSeleccionadas
    ? totalVendidoSeleccionado / ventasRegistradasSeleccionadas
    : 0;
  const etiquetaPeriodo =
    fechaDesde && fechaHasta
      ? `${new Date(fechaDesde + "T12:00:00").toLocaleDateString("es-CL")} al ${new Date(fechaHasta + "T12:00:00").toLocaleDateString("es-CL")}`
      : fechaDesde || fechaHasta
        ? new Date((fechaDesde || fechaHasta) + "T12:00:00").toLocaleDateString(
            "es-CL",
          )
        : fechaEspecifica
          ? new Date(`${fechaEspecifica}T12:00:00`).toLocaleDateString("es-CL")
          : periodo === 0
            ? "Ayer"
            : periodo === 1
              ? "Hoy"
              : `Últimos ${periodo} días`;

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <TarjetaIndicador
        detalle={etiquetaPeriodo}
        etiqueta={
          categoriaGrafico === "todas"
            ? "Total vendido"
            : "Total vendido · " + categoriaSeleccionada
        }
        valor={formatearPrecio(totalVendidoSeleccionado)}
      />
      <TarjetaIndicador
        etiqueta="Total histórico vendido"
        detalle="Todas las ventas guardadas"
        valor={formatearPrecio(reporte.totalFacturadoHistorico)}
      />
      <TarjetaIndicador
        etiqueta={
          categoriaGrafico === "todas"
            ? "Ventas registradas"
            : "Ventas registradas · " + categoriaSeleccionada
        }
        valor={String(ventasRegistradasSeleccionadas)}
      />
      <TarjetaIndicador
        etiqueta={
          categoriaGrafico === "todas"
            ? "Unidades vendidas"
            : "Unidades vendidas · " + categoriaSeleccionada
        }
        valor={String(unidadesVendidasSeleccionadas)}
      />
      <TarjetaIndicador
        etiqueta={
          categoriaGrafico === "todas"
            ? "Promedio por venta"
            : "Promedio por venta · " + categoriaSeleccionada
        }
        valor={formatearPrecio(promedioSeleccionado)}
      />
    </div>
  );
}

function FinancieroDemo({
  periodo,
  reporte,
  fechaEspecifica,
  fechaDesde,
  fechaHasta,
  seleccionarDia,
  cambiarFechaDesde,
  cambiarFechaHasta,
  seleccionarPeriodo,
}) {
  const [categoriaGrafico, setCategoriaGrafico] = useState("todas");
  const categoriaSeleccionada =
    categoriaNombre[categoriaGrafico] ?? categoriaGrafico;
  const diasGrafico = reporte.dias.map((dia) => {
    if (categoriaGrafico === "todas") return dia;
    const datosCategoria = dia.porCategoria?.[categoriaGrafico];
    return {
      ...dia,
      total: datosCategoria?.total ?? 0,
      cantidad: datosCategoria?.cantidad ?? 0,
    };
  });
  const productosDestacados =
    categoriaGrafico === "todas"
      ? reporte.productosMasVendidos
      : (reporte.productosPorCategoria?.[categoriaGrafico] ?? []);
  const metodosPagoSeleccionados =
    categoriaGrafico === "todas"
      ? reporte.porMetodo
      : (reporte.porMetodoPorCategoria?.[categoriaGrafico] ?? []);
  const totalVendidoSeleccionado =
    categoriaGrafico === "todas"
      ? reporte.totalFacturado
      : (reporte.porCategoria.find((item) => item.nombre === categoriaGrafico)
          ?.total ?? 0);

  return (
    <section className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
            Reportes de gerencia
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Financiero
          </h1>
          <p className="mt-2 text-slate-600">
            Indicadores de ejemplo para recorrer el tablero.
          </p>
        </div>
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="demo-categoria-grafico"
        >
          Categoría de gráficos
          <select
            className="mt-1.5 block rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            id="demo-categoria-grafico"
            onChange={(event) => setCategoriaGrafico(event.target.value)}
            value={categoriaGrafico}
          >
            <option value="todas">Todas las categorías</option>
            {reporte.porCategoria.map((item) => (
              <option key={item.nombre} value={item.nombre}>
                {categoriaNombre[item.nombre] ?? item.nombre}
              </option>
            ))}
          </select>
        </label>
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="demo-fecha-desde"
        >
          Desde
          <input
            className="mt-1.5 block rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            id="demo-fecha-desde"
            max={fechaHasta || undefined}
            onChange={(event) => cambiarFechaDesde(event.target.value)}
            type="date"
            value={fechaDesde}
          />
        </label>
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="demo-fecha-hasta"
        >
          Hasta
          <input
            className="mt-1.5 block rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            id="demo-fecha-hasta"
            min={fechaDesde || undefined}
            onChange={(event) => cambiarFechaHasta(event.target.value)}
            type="date"
            value={fechaHasta}
          />
        </label>
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="demo-periodo"
        >
          Período
          <select
            className="mt-1.5 block rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            id="demo-periodo"
            onChange={(event) => seleccionarPeriodo(Number(event.target.value))}
            value={periodo}
          >
            <option value={1}>Hoy</option>
            <option value={0}>Ayer</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
        </label>
      </header>
      <ResumenIndicadores
        categoriaGrafico={categoriaGrafico}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        fechaEspecifica={fechaEspecifica}
        periodo={periodo}
        reporte={reporte}
      />
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {categoriaGrafico === "todas"
              ? "Tendencia diaria"
              : `Tendencia diaria · ${categoriaSeleccionada}`}
          </h2>
          <TendenciaVentas
            compacto={diasGrafico.length >= 30}
            dias={diasGrafico}
            onSeleccionarDia={seleccionarDia}
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Ventas por medio de pago
          </h2>
          <ListaAgrupacion
            cantidadEtiqueta="ventas"
            elementos={metodosPagoSeleccionados}
            totalPeriodo={totalVendidoSeleccionado}
          />
        </section>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Ventas por categoría
          </h2>
          <ListaAgrupacion
            elementos={reporte.porCategoria.map((item) => ({
              ...item,
              nombre: categoriaNombre[item.nombre] ?? item.nombre,
            }))}
            totalPeriodo={reporte.totalFacturado}
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {categoriaGrafico === "helados"
              ? "Helados más vendidos"
              : categoriaGrafico === "todas"
                ? "Productos más vendidos"
                : `Más vendidos · ${categoriaSeleccionada}`}
          </h2>
          <ListaAgrupacion
            elementos={productosDestacados}
            totalPeriodo={reporte.totalFacturado}
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Sabores de helado más elegidos
          </h2>
          <ListaAgrupacion
            cantidadEtiqueta="bochas"
            elementos={reporte.saboresMasElegidos}
            mostrarTotal={false}
          />
        </section>
      </div>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Ventas recientes
        </h2>
        <ListaVentas ventas={reporte.ventasRecientes} />
      </section>
    </section>
  );
}

function ListaAgrupacion({
  elementos,
  cantidadEtiqueta = "unidades",
  totalPeriodo = 0,
  mostrarTotal = true,
}) {
  const [orden, setOrden] = useState("default");
  const elementosOrdenados =
    orden === "default"
      ? elementos
      : [...elementos].sort((a, b) => {
          const campo = mostrarTotal ? "total" : "cantidad";
          return orden === "asc" ? a[campo] - b[campo] : b[campo] - a[campo];
        });

  if (!elementos.length)
    return (
      <p className="mt-4 text-sm text-slate-500">
        Sin datos para este período.
      </p>
    );

  return (
    <>
      <button
        className="mt-3 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600"
        onClick={() =>
          setOrden(
            orden === "default" ? "asc" : orden === "asc" ? "desc" : "default",
          )
        }
        type="button"
      >
        Orden:{" "}
        {orden === "default"
          ? "predeterminado"
          : orden === "asc"
            ? "menor a mayor"
            : "mayor a menor"}
      </button>
      <ul className="mt-3 divide-y divide-slate-100">
        {elementosOrdenados.map((item) => (
          <li
            className="flex items-center justify-between gap-3 py-3 text-sm"
            key={item.nombre}
          >
            <span>
              <span className="block text-slate-700">{item.nombre}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {item.cantidad} {cantidadEtiqueta}
                {totalPeriodo > 0
                  ? ` · ${((item.total / totalPeriodo) * 100).toFixed(1)}%`
                  : ""}
              </span>
            </span>
            {mostrarTotal && (
              <strong className="font-semibold text-slate-900">
                {formatearPrecio(item.total)}
              </strong>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function ListaVentas({ ventas }) {
  return (
    <ul className="mt-3 divide-y divide-slate-100">
      {ventas.map((venta) => (
        <li className="py-2 text-sm" key={venta.id}>
          <details className="group rounded-lg">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-3 hover:bg-slate-50">
              <span>
                <span className="block font-medium text-slate-800">
                  {new Date(venta.creadaEn).toLocaleString("es-CL")}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {venta.metodoPago} ·{" "}
                  {venta.estado === "pendiente"
                    ? "Pendiente de sincronizar"
                    : "Sincronizada"}{" "}
                  ·{" "}
                  {venta.items.reduce(
                    (total, item) => total + item.cantidad,
                    0,
                  )}{" "}
                  unidades
                </span>
              </span>
              <span className="ml-auto flex items-center gap-3">
                <strong className="text-slate-900">
                  {formatearPrecio(venta.total)}
                </strong>
                <span className="text-xs font-semibold text-emerald-800 group-open:hidden">
                  Ver detalle
                </span>
                <span className="hidden text-xs font-semibold text-emerald-800 group-open:inline">
                  Ocultar detalle
                </span>
              </span>
            </summary>
            <div className="mx-3 mb-3 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Productos de la venta
              </p>
              <ul className="divide-y divide-slate-200">
                {venta.items.map((item, indice) => (
                  <li
                    className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2"
                    key={`${venta.id}-${item.nombre}-${indice}`}
                  >
                    <span className="text-slate-700">
                      {item.nombre} · {item.cantidad} ×{" "}
                      {formatearPrecio(item.totalLinea / item.cantidad)}
                    </span>
                    <strong className="text-slate-900">
                      {formatearPrecio(item.totalLinea)}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

function obtenerEstadoStockDemo(producto) {
  if (!Number.isInteger(producto.stockDisponible)) return "sin-conteo";
  if (producto.stockDisponible === 0) return "agotado";
  const minimo = Number.isInteger(producto.stockMinimo)
    ? producto.stockMinimo
    : 0;
  if (producto.stockDisponible <= minimo) return "reponer";
  if (minimo > 0 && producto.stockDisponible <= minimo * 2)
    return "por-agotarse";
  return "en-stock";
}

const estadosStockDemo = [
  { id: "todos", nombre: "Todos los estados" },
  { id: "agotado", nombre: "Agotado" },
  { id: "reponer", nombre: "Reponer" },
  { id: "por-agotarse", nombre: "Por agotarse" },
  { id: "en-stock", nombre: "En stock" },
  { id: "sin-conteo", nombre: "Sin conteo" },
];

function InventarioDemo({ productos, rol, setProductos }) {
  const [cantidadesCarga, setCantidadesCarga] = useState({});
  const [detallesCarga, setDetallesCarga] = useState({});
  const [modoInventario, setModoInventario] = useState("");
  const [minimosEditados, setMinimosEditados] = useState({});
  const [movimientosDemo, setMovimientosDemo] = useState([]);
  const [errorCarga, setErrorCarga] = useState("");
  const esAdministrador = rol === "Administrador";
  const [categoriaActiva, setCategoriaActiva] = useState("todos");
  const [estadoActivo, setEstadoActivo] = useState("todos");
  const [orden, setOrden] = useState({ campo: null, direccion: "asc" });
  const stock = productos.filter(
    (producto) => producto.controlaStock || producto.esSabor,
  );
  const stockFiltrado = stock
    .filter(
      (producto) =>
        categoriaActiva === "todos" || producto.categoria === categoriaActiva,
    )
    .filter(
      (producto) =>
        estadoActivo === "todos" ||
        obtenerEstadoStockDemo(producto) === estadoActivo,
    )
    .sort((a, b) => {
      if (orden.campo === "stock") {
        const stockA = a.stockDisponible;
        const stockB = b.stockDisponible;
        if (!Number.isInteger(stockA) && !Number.isInteger(stockB)) return 0;
        if (!Number.isInteger(stockA)) return 1;
        if (!Number.isInteger(stockB)) return -1;
      }
      const comparacion =
        orden.campo === "stock"
          ? a.stockDisponible - b.stockDisponible
          : a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      return orden.direccion === "asc" ? comparacion : -comparacion;
    });

  function alternarOrden(campo) {
    setOrden((actual) => {
      if (actual.campo !== campo) return { campo, direccion: "asc" };
      if (actual.direccion === "asc") return { campo, direccion: "desc" };
      return { campo: null, direccion: "asc" };
    });
  }

  function guardarMinimosDemo() {
    setProductos((actuales) => actuales.map((producto) => ({
      ...producto,
      ...(Object.prototype.hasOwnProperty.call(minimosEditados, producto.id)
        ? { stockMinimo: Number(minimosEditados[producto.id]) }
        : {}),
    })));
    setModoInventario("");
    setErrorCarga("");
  }

  function confirmarCargas() {
    const conCantidad = stock.filter((item) => cantidadesCarga[item.id] !== undefined && cantidadesCarga[item.id] !== "");
    if (!conCantidad.length) {
      setErrorCarga("Ingresa cantidad y detalle para al menos un producto.");
      return;
    }
    const invalidos = conCantidad.filter((item) => {
      const cantidad = Number(cantidadesCarga[item.id]);
      return !Number.isInteger(cantidad) || cantidad < 1;
    });
    if (invalidos.length) {
      setErrorCarga("Revisa la cantidad para: " + invalidos.map((item) => item.nombre).join(", ") + ".");
      return;
    }
    const cargas = conCantidad.map((item) => {
      const cantidad = Number(cantidadesCarga[item.id]);
      const saldoPosterior = (item.stockDisponible ?? 0) + cantidad;
      return { item, cantidad, saldoPosterior, detalle: detallesCarga[item.id]?.trim() || "Carga de stock" };
    });
    setProductos((actuales) => actuales.map((producto) => {
      const carga = cargas.find(({ item }) => item.id === producto.id);
      return carga ? { ...producto, stockDisponible: carga.saldoPosterior } : producto;
    }));
    setMovimientosDemo((actuales) => [{
      id: `informe-demo-${globalThis.crypto.randomUUID()}`,
      fecha: new Date().toISOString(),
      empleado: rol === "Cajero" ? "Empleado de prueba" : "Administrador de prueba",
      productos: cargas.map(({ item, cantidad, detalle }) => ({ nombre: item.nombre, cantidad, descripcion: detalle })),
    }, ...actuales]);
    setCantidadesCarga({});
    setDetallesCarga({});
    setModoInventario("");
    setErrorCarga("");
  }
  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Inventario
      </h1>
      <p className="mt-2 text-slate-600">
        Carga porciones y ajusta el mínimo requerido por sabor.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {esAdministrador && <button className={`rounded-lg border px-4 py-2 text-sm font-semibold ${modoInventario === "minimos" ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-700"}`} onClick={() => { setModoInventario(modoInventario === "minimos" ? "" : "minimos"); setErrorCarga(""); setMinimosEditados(Object.fromEntries(stock.map((item) => [item.id, String(item.stockMinimo ?? 0)]))); }} type="button">Editar mínimos</button>}
        <button className={`rounded-lg border px-4 py-2 text-sm font-semibold ${modoInventario === "carga" ? "border-emerald-800 bg-emerald-800 text-white" : "border-emerald-800 bg-white text-emerald-800"}`} onClick={() => { setModoInventario(modoInventario === "carga" ? "" : "carga"); setErrorCarga(""); setCantidadesCarga({}); setDetallesCarga({}); }} type="button">Cargar stock</button>
      </div>
      {errorCarga && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{errorCarga}</p>}
      <div
        aria-label="Filtrar inventario por categoría"
        className="mt-5 flex flex-wrap gap-2"
        role="group"
      >
        {[
          { id: "todos", nombre: "Todas" },
          ...listarCategoriasProductos(),
        ].map((categoria) => (
          <button
            aria-pressed={categoriaActiva === categoria.id}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${categoriaActiva === categoria.id ? "bg-emerald-800 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            key={categoria.id}
            onClick={() => setCategoriaActiva(categoria.id)}
            type="button"
          >
            {categoria.nombre}
          </button>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th
                aria-sort={
                  orden.campo === "nombre"
                    ? orden.direccion === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className="px-5 py-3 font-semibold"
              >
                <button
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                  onClick={() => alternarOrden("nombre")}
                  type="button"
                >
                  Producto{" "}
                  <span aria-hidden="true">
                    {orden.campo === "nombre"
                      ? orden.direccion === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}
                  </span>
                </button>
              </th>
              <th
                aria-sort={
                  orden.campo === "stock"
                    ? orden.direccion === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className="px-5 py-3 font-semibold"
              >
                <button
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                  onClick={() => alternarOrden("stock")}
                  type="button"
                >
                  Disponible{" "}
                  <span aria-hidden="true">
                    {orden.campo === "stock"
                      ? orden.direccion === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}
                  </span>
                </button>
              </th>
              <th className="px-5 py-3 font-semibold">Mínimo</th>
              <th className="px-5 py-3 font-semibold">
                <label className="flex flex-col gap-1.5">
                  Estado
                  <select
                    aria-label="Filtrar por estado de stock"
                    className="max-w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-700"
                    onChange={(event) => setEstadoActivo(event.target.value)}
                    value={estadoActivo}
                  >
                    {estadosStockDemo.map((estado) => (
                      <option key={estado.id} value={estado.id}>
                        {estado.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stockFiltrado.length === 0 ? (
              <tr>
                <td
                  className="px-5 py-6 text-center text-slate-500"
                  colSpan={4}
                >
                  No hay productos en esta categoría.
                </td>
              </tr>
            ) : (
              stockFiltrado.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {item.nombre}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {Number.isInteger(item.stockDisponible)
                      ? `${item.stockDisponible} ${item.esSabor ? "porciones" : "unidades"}`
                      : "Sin conteo"}
                    {modoInventario === "carga" && <div className="mt-2 grid min-w-44 gap-2">
                      <label className="text-xs font-medium text-slate-600">Cantidad a agregar<input aria-label={`Cantidad a cargar de ${item.nombre}`} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" min="1" onChange={(event) => setCantidadesCarga((actuales) => ({ ...actuales, [item.id]: event.target.value }))} type="number" value={cantidadesCarga[item.id] ?? ""} /></label>
                      <label className="text-xs font-medium text-slate-600">Detalle (opcional)<input aria-label={`Detalle de carga de ${item.nombre}`} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" onChange={(event) => setDetallesCarga((actuales) => ({ ...actuales, [item.id]: event.target.value }))} placeholder="Ej.: Reposición proveedor" value={detallesCarga[item.id] ?? ""} /></label>
                    </div>}
                  </td>
                  <td className="px-5 py-4">
                    {modoInventario === "minimos" ? <input aria-label={`Stock minimo de ${item.nombre}`} className="w-20 rounded-md border border-slate-300 px-2 py-1.5" min="0" onChange={(event) => setMinimosEditados((actuales) => ({ ...actuales, [item.id]: event.target.value }))} type="number" value={minimosEditados[item.id] ?? item.stockMinimo ?? 0} /> : item.stockMinimo ?? 0}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${{ agotado: "bg-red-100 text-red-800", reponer: "bg-red-100 text-red-800", "por-agotarse": "bg-amber-100 text-amber-800", "sin-conteo": "bg-slate-100 text-slate-700", "en-stock": "bg-emerald-100 text-emerald-800" }[obtenerEstadoStockDemo(item)]}`}
                    >
                      {
                        {
                          agotado: "Agotado",
                          reponer: "Reponer",
                          "por-agotarse": "Por agotarse",
                          "en-stock": "En stock",
                          "sin-conteo": "Cargar stock",
                        }[obtenerEstadoStockDemo(item)]
                      }
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {modoInventario && <div className="mt-3 flex justify-end gap-2">
        <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => { setModoInventario(""); setErrorCarga(""); }} type="button">Cancelar</button>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" onClick={modoInventario === "carga" ? confirmarCargas : guardarMinimosDemo} type="button">{modoInventario === "carga" ? "Confirmar cargas" : "Confirmar minimos"}</button>
      </div>}      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Historial de reposición</h2>
        {movimientosDemo.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Cada confirmación genera un informe con fecha, empleado y los productos cargados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {movimientosDemo.map((informe) => (
              <li className="py-3 text-sm" key={informe.id}>
                <div className="flex flex-wrap justify-between gap-2"><strong>{new Date(informe.fecha).toLocaleString("es-AR")} · {informe.empleado}</strong><span className="text-slate-500">{informe.productos.length} productos</span></div>
                <ul className="mt-2 space-y-1 pl-5 text-slate-600">
                  {informe.productos.map((producto, indice) => <li className="list-disc" key={`${informe.id}-${producto.nombre}-${indice}`}><span className="font-medium text-slate-800">{producto.nombre}</span> · +{producto.cantidad} · {producto.descripcion}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function AdministracionDemo({
  productos,
  setProductos,
  usuarios,
  setUsuarios,
}) {
  const [categoriasProductos, setCategoriasProductos] = useState(listarCategoriasProductos);
  const [categoriasEliminables, setCategoriasEliminables] = useState(() => ({
    productos: listarCategoriasEliminables("productos"),
    sabores: listarCategoriasEliminables("sabores"),
  }));
  const [categoriasSabores, setCategoriasSabores] = useState(() => {
    return listarCategoriasSabores();
  });
  const [altaCategoriaSabor, setAltaCategoriaSabor] = useState(false);
  const [nombreCategoriaSabor, setNombreCategoriaSabor] = useState("");
  const [errorCategoriaSabor, setErrorCategoriaSabor] = useState("");
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [modalBorrarCategoriasAbierto, setModalBorrarCategoriasAbierto] = useState(false);
  const [nombreCategoria, setNombreCategoria] = useState("");
  const [tipoCategoria, setTipoCategoria] = useState("productos");
  const [tipoCategoriaEliminar, setTipoCategoriaEliminar] = useState("productos");
  const [categoriasEliminarSeleccionadas, setCategoriasEliminarSeleccionadas] = useState([]);
  const [errorCategoria, setErrorCategoria] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState("");
  const [formularioProducto, setFormularioProducto] = useState(
    formularioProductoDemoVacio,
  );
  const [errorProducto, setErrorProducto] = useState("");
  const [mensajeProducto, setMensajeProducto] = useState("");
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    email: "",
    password: "",
    rol: "Cajero",
  });
  const [errorUsuario, setErrorUsuario] = useState("");
  const [usuarioCreado, setUsuarioCreado] = useState("");
  const [mostrarTodosProductos, setMostrarTodosProductos] = useState(false);
  const productosFiltrados = productos.filter((producto) => {
    const coincideCategoria = categoriaFiltro === "todos" || producto.categoria === categoriaFiltro;
    const termino = busquedaCatalogo.trim().toLocaleLowerCase("es");
    return coincideCategoria && (!termino || `${producto.nombre} ${producto.detalle ?? ""}`.toLocaleLowerCase("es").includes(termino));
  });
  const productosVisibles = mostrarTodosProductos ? productosFiltrados : productosFiltrados.slice(0, 6);

  function guardarCategoriaDemo(event) {
    event.preventDefault();
    setErrorCategoria("");
    try {
      const creada = crearCategoriaCatalogo(nombreCategoria, tipoCategoria);
      if (tipoCategoria === "sabores") {
        setCategoriasSabores((actuales) => [...actuales, creada]);
        setCategoriasEliminables((actuales) => ({ ...actuales, sabores: [...actuales.sabores, creada] }));
      } else {
        setCategoriasProductos((actuales) => [...actuales, creada]);
        setCategoriasEliminables((actuales) => ({ ...actuales, productos: [...actuales.productos, creada] }));
      }
      setNombreCategoria("");
      setModalCategoriaAbierto(false);
    } catch (err) {
      setErrorCategoria(err instanceof Error ? err.message : "No se pudo guardar la categoría.");
    }
  }

  function eliminarCategoriasDemo() {
    const esSabor = tipoCategoriaEliminar === "sabores";
    try {
      eliminarCategoriasCatalogo(categoriasEliminarSeleccionadas, tipoCategoriaEliminar);
      if (esSabor) {
        setCategoriasSabores((actuales) => actuales.filter((categoria) => !categoriasEliminarSeleccionadas.includes(categoria.id)));
        setCategoriasEliminables((actuales) => ({ ...actuales, sabores: actuales.sabores.filter((categoria) => !categoriasEliminarSeleccionadas.includes(categoria.id)) }));
      } else {
        setCategoriasProductos((actuales) => actuales.filter((categoria) => !categoriasEliminarSeleccionadas.includes(categoria.id)));
        setCategoriasEliminables((actuales) => ({ ...actuales, productos: actuales.productos.filter((categoria) => !categoriasEliminarSeleccionadas.includes(categoria.id)) }));
      }
      setCategoriasEliminarSeleccionadas([]);
      setErrorCategoria("");
      setModalBorrarCategoriasAbierto(false);
    } catch (err) {
      setErrorCategoria(err instanceof Error ? err.message : "No se pudo eliminar la categoría.");
    }
  }

  function agregarCategoriaSaborDemo() {
    setErrorCategoriaSabor("");
    try {
      const creada = crearCategoriaCatalogo(nombreCategoriaSabor, "sabores");
      setCategoriasSabores((actuales) => [...actuales, creada]);
      setCategoriasEliminables((actuales) => ({ ...actuales, sabores: [...actuales.sabores, creada] }));
      setFormularioProducto((actual) => ({ ...actual, categoriaSabor: creada.id }));
      setNombreCategoriaSabor("");
      setAltaCategoriaSabor(false);
    } catch (err) {
      setErrorCategoriaSabor(err instanceof Error ? err.message : "No se pudo crear la categoría.");
    }
  }

  useEffect(() => {
    if (!modalProductoAbierto) return undefined;

    document.getElementById("demo-product-name")?.focus();
    function cerrarConEscape(event) {
      if (event.key !== "Escape") return;
      setModalProductoAbierto(false);
      setProductoEditando("");
      setFormularioProducto(formularioProductoDemoVacio);
      setErrorProducto("");
    }

    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [modalProductoAbierto]);

  function editarProductoDemo(producto) {
    setModalProductoAbierto(true);
    setProductoEditando(producto.id);
    setFormularioProducto({
      nombre: producto.configuracionVenta
        ? producto.nombre.replace(/^Cucurucho\s*/i, "")
        : producto.nombre,
      categoria:
        producto.configuracionVenta || producto.esSabor
          ? "helados"
          : producto.categoria,
      precio: String(producto.precio),
      detalle: producto.detalle ?? "",
      imagenUrl: producto.imagenUrl ?? "",
      esSabor: producto.esSabor ?? false,
      categoriaSabor: producto.categoriaSabor ?? "",
      tipoCucurucho: Boolean(producto.configuracionVenta),
      configurarSabores: Boolean(producto.configuracionVenta),
      cantidadSabores: String(
        producto.configuracionVenta?.cantidadSabores ?? 1,
      ),
      stockMinimo: String(producto.stockMinimo ?? 3),
    });
    setErrorProducto("");
    setMensajeProducto("");
  }

  function cancelarEdicionProducto() {
    setModalProductoAbierto(false);
    setProductoEditando("");
    setFormularioProducto(formularioProductoDemoVacio);
    setErrorProducto("");
  }

  function guardarProductoDemo(event) {
    event.preventDefault();
    setErrorProducto("");
    setMensajeProducto("");

    const nombre = formularioProducto.nombre.trim();
    const precio = formularioProducto.esSabor
      ? Number(formularioProducto.precio) || 1
      : Number(formularioProducto.precio);
    const imagenUrl = formularioProducto.imagenUrl.trim();

    if (formularioProducto.esSabor && !formularioProducto.categoriaSabor) {
      setErrorProducto("Selecciona o crea una categoría para este insumo de sabor.");
      return;
    }

    if (
      !nombre ||
      !Number.isFinite(precio) ||
      precio <= 0
    ) {
      setErrorProducto("Ingresa un nombre y un precio mayor que cero.");
      return;
    }

    if (imagenUrl) {
      try {
        const url = new URL(imagenUrl);
        if (!["http:", "https:"].includes(url.protocol))
          throw new Error("URL no segura");
      } catch {
        setErrorProducto("La foto debe tener una URL HTTP o HTTPS válida.");
        return;
      }
    }

    const producto = {
      ...(productoEditando
        ? productos.find((item) => item.id === productoEditando)
        : {}),
      id: productoEditando || `demo-producto-${globalThis.crypto.randomUUID()}`,
      nombre: formularioProducto.tipoCucurucho ? `Cucurucho ${nombre}` : nombre,
      categoria:
        formularioProducto.tipoCucurucho || formularioProducto.esSabor
          ? "helados"
          : formularioProducto.categoria,
      precio,
      detalle: formularioProducto.detalle.trim(),
      imagenUrl,
      esSabor: formularioProducto.esSabor,
      categoriaSabor: formularioProducto.esSabor ? formularioProducto.categoriaSabor : undefined,
      controlaStock:
        !formularioProducto.configurarSabores || formularioProducto.esSabor,
      stockMinimo:
        !formularioProducto.configurarSabores || formularioProducto.esSabor
          ? Number(formularioProducto.stockMinimo)
          : undefined,
      configuracionVenta: formularioProducto.configurarSabores
        ? {
            tipo: "sabores",
            cantidadSabores: Number(formularioProducto.cantidadSabores),
            permitirRepetidos: true,
          }
        : null,
    };

    if (productoEditando) {
      setProductos((actuales) =>
        actuales.map((actual) =>
          actual.id === productoEditando ? producto : actual,
        ),
      );
      setMensajeProducto(
        `Se actualizaron los datos de «${nombre}» en esta demostración.`,
      );
    } else {
      setProductos((actuales) => [...actuales, producto]);
      setMensajeProducto(`Se agregó «${nombre}» solo a esta demostración.`);
    }

    cancelarEdicionProducto();
  }

  function crearUsuarioDemo(event) {
    event.preventDefault();
    setErrorUsuario("");
    setUsuarioCreado("");

    const nombre = nuevoUsuario.nombre.trim();
    const apellido = nuevoUsuario.apellido.trim();
    const email = nuevoUsuario.email.trim();
    const emailNormalizado = email.toLocaleLowerCase("es");

    if (
      usuarios.some(
        (usuario) => usuario.email.toLocaleLowerCase("es") === emailNormalizado,
      )
    ) {
      setErrorUsuario("Ya existe una cuenta de demostración con ese correo.");
      return;
    }

    setUsuarios((actuales) => [
      ...actuales,
      {
        id: `demo-usuario-${globalThis.crypto.randomUUID()}`,
        nombre,
        apellido,
        dni: nuevoUsuario.dni,
        email,
        rol: nuevoUsuario.rol,
      },
    ]);
    setNuevoUsuario({ nombre: "", apellido: "", dni: "", email: "", password: "", rol: "Cajero" });
    setUsuarioCreado(`Se agregó la cuenta demostrativa de ${nombre}.`);
  }

  return (
    <section className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Administración
      </h1>
      <p className="mt-2 text-slate-600">
        Gestión de catálogo y cuentas de usuario de ejemplo.
      </p>
      {mensajeProducto && (
        <p
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          role="status"
        >
          {mensajeProducto}
          <button
            className="ml-3 font-semibold underline"
            onClick={() => setMensajeProducto("")}
            type="button"
          >
            Cerrar
          </button>
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => { setErrorCategoria(""); setModalCategoriaAbierto(true); }}
          type="button"
        >
          Agregar nueva categoría
        </button>
        <button
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
          onClick={() => {
            setProductoEditando("");
            setFormularioProducto(formularioProductoDemoVacio);
            setErrorProducto("");
            setMensajeProducto("");
            setModalProductoAbierto(true);
          }}
          type="button"
        >
          Agregar nuevo producto
        </button>
        <button className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => { setErrorCategoria(""); setModalBorrarCategoriasAbierto(true); }} type="button">Borrar categorías</button>
      </div>
      {modalCategoriaAbierto && (
        <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={guardarCategoriaDemo}>
          <label className="text-sm font-medium text-slate-700">Tipo de categoría
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" onChange={(event) => setTipoCategoria(event.target.value)} value={tipoCategoria}>
              <option value="productos">Productos del catálogo</option><option value="sabores">Categoría de sabores</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Nombre
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={60} minLength={2} onChange={(event) => setNombreCategoria(event.target.value)} required value={nombreCategoria} />
          </label>
          <div className="flex items-end gap-2"><button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white" type="submit">Guardar categoría</button><button className="rounded-lg border px-4 py-2 text-sm" onClick={() => setModalCategoriaAbierto(false)} type="button">Cancelar</button></div>
          {errorCategoria && <p className="text-sm text-red-700 sm:col-span-3" role="alert">{errorCategoria}</p>}
          {tipoCategoria === "sabores" && <p className="text-sm text-slate-500 sm:col-span-3">Luego agrega cada sabor como producto; el sabor aparecerá como subcategoría para elegir en ventas.</p>}
        </form>
      )}
      {modalBorrarCategoriasAbierto && (
        <div className="mt-4 grid gap-3 rounded-xl border border-red-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-medium text-slate-700">Tipo de categoría
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" onChange={(event) => { setTipoCategoriaEliminar(event.target.value); setCategoriasEliminarSeleccionadas([]); setErrorCategoria(""); }} value={tipoCategoriaEliminar}>
              <option value="productos">Categorías de productos (Ventas / Inventario)</option><option value="sabores">Categorías de insumos (sabores)</option>
            </select>
          </label>
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 sm:col-span-2">
            <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="w-12 px-3 py-2"><input aria-label="Seleccionar todas las categorías" checked={categoriasEliminables[tipoCategoriaEliminar].length > 0 && categoriasEliminarSeleccionadas.length === categoriasEliminables[tipoCategoriaEliminar].length} onChange={(event) => setCategoriasEliminarSeleccionadas(event.target.checked ? categoriasEliminables[tipoCategoriaEliminar].map(({ id }) => id) : [])} type="checkbox" /></th><th className="px-3 py-2">Categoría</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{categoriasEliminables[tipoCategoriaEliminar].map((categoria) => <tr key={categoria.id}><td className="px-3 py-2"><input aria-label={`Seleccionar ${categoria.nombre}`} checked={categoriasEliminarSeleccionadas.includes(categoria.id)} onChange={(event) => setCategoriasEliminarSeleccionadas((actuales) => event.target.checked ? [...actuales, categoria.id] : actuales.filter((id) => id !== categoria.id))} type="checkbox" /></td><td className="px-3 py-2">{categoria.nombre}</td></tr>)}{categoriasEliminables[tipoCategoriaEliminar].length === 0 && <tr><td className="px-3 py-4 text-slate-500" colSpan="2">No hay categorías disponibles.</td></tr>}</tbody>
            </table>
          </div>
          <div className="flex items-end gap-2"><button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!categoriasEliminarSeleccionadas.length} onClick={eliminarCategoriasDemo} type="button">Borrar seleccionadas ({categoriasEliminarSeleccionadas.length})</button><button className="rounded-lg border px-4 py-2 text-sm" onClick={() => setModalBorrarCategoriasAbierto(false)} type="button">Cancelar</button></div>
          {tipoCategoriaEliminar === "productos" && <p className="text-xs text-slate-500 sm:col-span-3">Los productos existentes se conservan y aparecen sin categoría; podrás reasignarlos al editarlos.</p>}
          {errorCategoria && <p className="text-sm text-red-700 sm:col-span-3" role="alert">{errorCategoria}</p>}
        </div>
      )}
      {modalProductoAbierto && (
        <>
          <div
            aria-hidden="true"
            className="product-edit-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget)
                cancelarEdicionProducto();
            }}
          />
          <form
            aria-labelledby="demo-product-form-title"
            aria-modal="true"
            className="product-edit-dialog grid gap-4 sm:grid-cols-2"
            onSubmit={guardarProductoDemo}
            role="dialog"
          >
            <h2
              className="text-lg font-semibold text-slate-900 sm:col-span-2"
              id="demo-product-form-title"
            >
              {productoEditando
                ? "Editar producto"
                : formularioProducto.tipoCucurucho
                  ? "Agregar tipo de cucurucho"
                  : formularioProducto.esSabor
                    ? "Agregar sabor"
                    : "Agregar producto"}
            </h2>
            {errorProducto && (
              <p
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2"
                role="alert"
              >
                {errorProducto}
              </p>
            )}
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="demo-product-name"
            >
              {formularioProducto.tipoCucurucho
                ? "Diferenciación"
                  : formularioProducto.esSabor
                    ? "Nombre del sabor final"
                  : "Nombre"}
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                id="demo-product-name"
                maxLength={120}
                placeholder={
                  formularioProducto.tipoCucurucho
                    ? "Simple, bañado en chocolate…"
                    : formularioProducto.esSabor
                      ? "Vainilla, chocolate…"
                      : ""
                }
                onChange={(event) =>
                  setFormularioProducto({
                    ...formularioProducto,
                    nombre: event.target.value,
                  })
                }
                required
                value={formularioProducto.nombre}
              />
            </label>
            {!formularioProducto.tipoCucurucho &&
              !formularioProducto.esSabor && (
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="demo-product-category"
                >
                  Categoría
                  <select
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                    id="demo-product-category"
                    onChange={(event) =>
                      setFormularioProducto({
                        ...formularioProducto,
                        categoria: event.target.value,
                      })
                    }
                    value={formularioProducto.categoria}
                  >
                    {!categoriasProductos.some(({ id }) => id === formularioProducto.categoria) && <option value={formularioProducto.categoria}>Categoría archivada (reasignar)</option>}
                    {categoriasProductos.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            {!formularioProducto.tipoCucurucho && formularioProducto.categoria === "helados" && !formularioProducto.esSabor && (
              <label className="flex items-start gap-3 text-sm font-medium text-slate-700 sm:col-span-2">
                <input checked={formularioProducto.esSabor} className="mt-0.5 accent-emerald-800" onChange={(event) => setFormularioProducto({ ...formularioProducto, esSabor: event.target.checked, categoriaSabor: "" })} type="checkbox" />
                Este producto es un insumo de sabor para preparar cucuruchos
              </label>
            )}
            {formularioProducto.esSabor && (
              <label className="text-sm font-medium text-slate-700" htmlFor="demo-flavor-category">
                Categoría del sabor
                <select className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal" id="demo-flavor-category" onChange={(event) => setFormularioProducto({ ...formularioProducto, categoriaSabor: event.target.value })} required value={formularioProducto.categoriaSabor}>
                  <option value="">Selecciona una categoría</option>
                  {formularioProducto.categoriaSabor && !categoriasSabores.some(({ id }) => id === formularioProducto.categoriaSabor) && <option value={formularioProducto.categoriaSabor}>Categoría archivada (reasignar)</option>}
                  {categoriasSabores.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                </select>
                {!altaCategoriaSabor ? <button className="mt-2 block text-sm font-semibold text-emerald-800 underline" onClick={() => { setAltaCategoriaSabor(true); setErrorCategoriaSabor(""); }} type="button">+ Crear categoría</button> : (
                  <span className="mt-2 flex flex-wrap gap-2">
                    <input aria-label="Nombre de la categoría de sabor" autoFocus className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-normal" maxLength={60} minLength={2} onChange={(event) => setNombreCategoriaSabor(event.target.value)} placeholder="Ej.: Chocolates" value={nombreCategoriaSabor} />
                    <button className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white" onClick={agregarCategoriaSaborDemo} type="button">Guardar</button>
                    <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setAltaCategoriaSabor(false)} type="button">Cancelar</button>
                    {errorCategoriaSabor && <span className="w-full text-sm text-red-700" role="alert">{errorCategoriaSabor}</span>}
                  </span>
                )}
                <span className="mt-1 block text-xs font-normal text-slate-500">El nombre del sabor será una opción dentro de esta categoría en ventas.</span>
              </label>
            )}
            {!formularioProducto.esSabor && (
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="demo-product-price"
              >
                {formularioProducto.tipoCucurucho
                  ? "Precio del cucurucho"
                  : "Precio"}
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                  id="demo-product-price"
                  min="1"
                  onChange={(event) =>
                    setFormularioProducto({
                      ...formularioProducto,
                      precio: event.target.value,
                    })
                  }
                  required
                  step="1"
                  type="number"
                  value={formularioProducto.precio}
                />
              </label>
            )}
            {(formularioProducto.esSabor ||
              (!formularioProducto.configurarSabores &&
                !formularioProducto.tipoCucurucho)) && (
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="demo-flavor-minimum"
              >
                {formularioProducto.esSabor
                  ? "Stock mínimo requerido (porciones)"
                  : "Stock mínimo requerido (unidades)"}
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                  id="demo-flavor-minimum"
                  min="0"
                  onChange={(event) =>
                    setFormularioProducto({
                      ...formularioProducto,
                      stockMinimo: event.target.value,
                    })
                  }
                  type="number"
                  value={formularioProducto.stockMinimo}
                />
              </label>
            )}
            {formularioProducto.tipoCucurucho && (
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="demo-cone-scoops"
              >
                Bochas disponibles al vender
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                  id="demo-cone-scoops"
                  max="6"
                  min="1"
                  onChange={(event) =>
                    setFormularioProducto({
                      ...formularioProducto,
                      cantidadSabores: event.target.value,
                    })
                  }
                  required
                  type="number"
                  value={formularioProducto.cantidadSabores}
                />
              </label>
            )}
            <label
              className="text-sm font-medium text-slate-700 sm:col-span-2"
              htmlFor="demo-product-detail"
            >
              Descripción
              <textarea
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                id="demo-product-detail"
                maxLength={240}
                onChange={(event) =>
                  setFormularioProducto({
                    ...formularioProducto,
                    detalle: event.target.value,
                  })
                }
                rows={3}
                value={formularioProducto.detalle}
              />
            </label>
            <label
              className="text-sm font-medium text-slate-700 sm:col-span-2"
              htmlFor="demo-product-image"
            >
              Foto del producto (URL pública opcional)
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                id="demo-product-image"
                onChange={(event) =>
                  setFormularioProducto({
                    ...formularioProducto,
                    imagenUrl: event.target.value,
                  })
                }
                placeholder="https://ejemplo.com/imagen-del-producto.jpg"
                type="url"
                value={formularioProducto.imagenUrl}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                La carga directa de archivos se agregará cuando exista el
                backend para almacenarlos.
              </span>
              {formularioProducto.imagenUrl && (
                <img
                  alt={`Vista previa de ${formularioProducto.nombre || "producto"}`}
                  className="mt-3 h-24 w-24 rounded-lg border border-slate-200 object-cover"
                  src={formularioProducto.imagenUrl}
                />
              )}
            </label>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
                type="submit"
              >
                {productoEditando ? "Confirmar cambios" : "Confirmar producto"}
              </button>
              <button
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={cancelarEdicionProducto}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </>
      )}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Catálogo ({productos.length})
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Categoría
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" onChange={(event) => { setCategoriaFiltro(event.target.value); setMostrarTodosProductos(false); }} value={categoriaFiltro}>
              <option value="todos">Todas las categorías</option>{categoriasProductos.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Buscar producto
            <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" onChange={(event) => { setBusquedaCatalogo(event.target.value); setMostrarTodosProductos(false); }} placeholder="Nombre o descripción" value={busquedaCatalogo} />
          </label>
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          {productosVisibles.length === 0 ? <li className="py-5 text-sm text-slate-500">No hay productos que coincidan con la búsqueda.</li> : productosVisibles.map((producto) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              key={producto.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                {producto.imagenUrl ? (
                  <img
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    src={producto.imagenUrl}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-14 w-14 shrink-0 rounded-lg bg-slate-100"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {producto.nombre}
                  </p>
                  <p className="text-slate-500">
                    {categoriaNombre[producto.categoria]} ·{" "}
                    {producto.detalle || "Sin descripción"}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {producto.esSabor
                      ? "Sabor (insumo)"
                      : formatearPrecio(producto.precio)}
                  </p>
                </div>
              </div>
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => editarProductoDemo(producto)}
                type="button"
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
        {productosFiltrados.length > 6 && (
          <button
            aria-expanded={mostrarTodosProductos}
            className="mt-4 rounded-lg border border-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            onClick={() => setMostrarTodosProductos((actual) => !actual)}
            type="button"
          >
            {mostrarTodosProductos ? "Mostrar menos" : "Mostrar más"}
          </button>
        )}
      </section>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Usuarios de demostración
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Las cuentas creadas aquí solo existen temporalmente en esta vista
          previa.
        </p>
        {errorUsuario && (
          <p
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {errorUsuario}
          </p>
        )}
        {usuarioCreado && (
          <p
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            {usuarioCreado}
          </p>
        )}
        <form
          className="mt-4 grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2"
          onSubmit={crearUsuarioDemo}
        >
          <label className="text-sm font-medium text-slate-700" htmlFor="demo-user-surname">
            Apellido
            <input autoComplete="family-name" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" id="demo-user-surname" onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, apellido: event.target.value })} required value={nuevoUsuario.apellido} />
          </label>
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="demo-user-name"
          >
            Nombre
            <input
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="demo-user-name"
              onChange={(event) =>
                setNuevoUsuario({ ...nuevoUsuario, nombre: event.target.value })
              }
              required
              value={nuevoUsuario.nombre}
            />
          </label>
          <label className="text-sm font-medium text-slate-700" htmlFor="demo-user-dni">
            DNI
            <input autoComplete="off" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" id="demo-user-dni" inputMode="numeric" onChange={(event) => setNuevoUsuario({ ...nuevoUsuario, dni: event.target.value.replace(/\D/g, "") })} required value={nuevoUsuario.dni} />
          </label>
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="demo-user-email"
          >
            Correo electrónico
            <input
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="demo-user-email"
              onChange={(event) =>
                setNuevoUsuario({ ...nuevoUsuario, email: event.target.value })
              }
              required
              type="email"
              value={nuevoUsuario.email}
            />
          </label>
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="demo-user-password"
          >
            Contraseña
            <input
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="demo-user-password"
              onChange={(event) =>
                setNuevoUsuario({
                  ...nuevoUsuario,
                  password: event.target.value,
                })
              }
              required
              type="password"
              value={nuevoUsuario.password}
            />
          </label>
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="demo-user-role"
          >
            Rol
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
              id="demo-user-role"
              onChange={(event) =>
                setNuevoUsuario({ ...nuevoUsuario, rol: event.target.value })
              }
              value={nuevoUsuario.rol}
            >
              <option value="Cajero">Empleado</option>
              <option value="Administrador">Administrador</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
              type="submit"
            >
              Crear usuario de demostración
            </button>
          </div>
        </form>
        <h3 className="mt-6 font-semibold text-slate-900">
          Cuentas ({usuarios.length})
        </h3>
        <ul className="mt-3 divide-y divide-slate-100">
          {usuarios.map((usuario) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              key={usuario.id}
            >
              <span>
                <strong>{usuario.apellido ? `${usuario.apellido}, ${usuario.nombre}` : usuario.nombre}</strong>
                <span className="ml-3 text-slate-500">{usuario.email}</span>
              </span>
              <span className="font-medium text-emerald-800">
                {usuario.rol}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

export default PreviewPage;
