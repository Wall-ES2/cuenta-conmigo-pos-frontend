import { categorias as categoriasBase } from "../../ventas/data/productos.js";

const claveCategorias = "cuenta-conmigo-categorias-productos-v1";
const claveCategoriasSabores = "cuenta-conmigo-categorias-sabores-v1";
const claveCategoriasProductosEliminadas = "cuenta-conmigo-categorias-productos-eliminadas-v1";
const claveCategoriasSaboresInicializadas = "cuenta-conmigo-categorias-sabores-inicializadas-v1";
const categoriasSaboresIniciales = [
  { id: "chocolates", nombre: "Chocolates" },
  { id: "frutales", nombre: "Frutales" },
  { id: "cremas", nombre: "Cremas" },
  { id: "especiales", nombre: "Especiales" },
];

function leerLista(clave) {
  try {
    const lista = JSON.parse(globalThis.localStorage?.getItem(clave) ?? "[]");
    return Array.isArray(lista)
      ? lista.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.nombre === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function slugificar(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function guardarLista(clave, lista) {
  try {
    globalThis.localStorage?.setItem(clave, JSON.stringify(lista));
  } catch {
    throw new Error("No se pudieron guardar las categorías en este dispositivo.");
  }
}

function leerIdsEliminados() {
  try {
    const ids = JSON.parse(globalThis.localStorage?.getItem(claveCategoriasProductosEliminadas) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function guardarIdsEliminados(ids) {
  try {
    globalThis.localStorage?.setItem(claveCategoriasProductosEliminadas, JSON.stringify(ids));
  } catch {
    throw new Error("No se pudieron actualizar las categorías en este dispositivo.");
  }
}

export function listarCategoriasProductos() {
  const personalizadas = leerLista(claveCategorias);
  const eliminadas = new Set(leerIdsEliminados());
  const base = categoriasBase.filter(({ id }) => id !== "todos");
  return [
    ...base.filter(({ id }) => !eliminadas.has(id)),
    ...personalizadas.filter(
      (categoria) => !base.some(({ id }) => id === categoria.id) && !eliminadas.has(categoria.id),
    ),
  ];
}

export function listarCategoriasSabores() {
  const guardadas = leerLista(claveCategoriasSabores);
  try {
    const inicializadas = globalThis.localStorage?.getItem(claveCategoriasSaboresInicializadas) === "true";
    if (inicializadas) return guardadas;
    const iniciales = guardadas.length ? guardadas : categoriasSaboresIniciales;
    guardarLista(claveCategoriasSabores, iniciales);
    globalThis.localStorage?.setItem(claveCategoriasSaboresInicializadas, "true");
    return iniciales;
  } catch {
    return guardadas.length ? guardadas : categoriasSaboresIniciales;
  }
}

export function listarCategoriasEliminables(tipo = "productos") {
  const lista = tipo === "sabores"
    ? listarCategoriasSabores()
    : leerLista(claveCategorias);
  if (tipo === "sabores") return lista;
  return listarCategoriasProductos();
}

export function eliminarCategoriaCatalogo(id, tipo = "productos") {
  eliminarCategoriasCatalogo([id], tipo);
}

export function eliminarCategoriasCatalogo(ids, tipo = "productos") {
  const seleccionadas = [...new Set(ids.filter((id) => typeof id === "string" && id))];
  if (!seleccionadas.length) throw new Error("Selecciona al menos una categoría.");
  const clave = tipo === "sabores" ? claveCategoriasSabores : claveCategorias;
  const lista = leerLista(clave);
  const idsBase = new Set(
    tipo === "sabores" ? [] : categoriasBase.filter(({ id }) => id !== "todos").map(({ id }) => id),
  );
  const idsPresentes = new Set([...lista.map(({ id }) => id), ...idsBase]);
  const inexistentes = seleccionadas.filter((id) => !idsPresentes.has(id));
  if (inexistentes.length) {
    throw new Error("Una o más categorías seleccionadas ya no están disponibles.");
  }
  const idsAEliminar = new Set(seleccionadas);
  if (tipo !== "sabores") {
    guardarIdsEliminados([...new Set([...leerIdsEliminados(), ...seleccionadas.filter((id) => idsBase.has(id))])]);
  }
  if (lista.some(({ id }) => idsAEliminar.has(id))) {
    guardarLista(clave, lista.filter(({ id }) => !idsAEliminar.has(id)));
  }
}

export function crearCategoriaCatalogo(nombre, tipo = "productos") {
  const valor = nombre.trim();
  if (valor.length < 2 || valor.length > 60) {
    throw new Error("El nombre de la categoría debe tener entre 2 y 60 caracteres.");
  }

  const clave =
    tipo === "sabores" ? claveCategoriasSabores : claveCategorias;
  const lista = leerLista(clave);
  const id = slugificar(valor);
  if (!id || lista.some((categoria) => categoria.id === id)) {
    throw new Error("Ya existe una categoría con ese nombre.");
  }

  const categoria = { id, nombre: valor };
  if (tipo !== "sabores") {
    guardarIdsEliminados(leerIdsEliminados().filter((eliminado) => eliminado !== id));
  }
  guardarLista(clave, [...lista, categoria]);
  return categoria;
}
