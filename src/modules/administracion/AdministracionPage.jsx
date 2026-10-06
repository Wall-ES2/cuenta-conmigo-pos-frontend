import { useEffect, useState } from 'react'
import { categorias, formatearPrecio } from '../ventas/data/productos.js'
import {
  actualizarProductoApi,
  crearProductoApi,
  eliminarProductoApi
} from './services/productosApi.js'
import {
  crearUsuarioApi,
  eliminarUsuarioApi,
  listarUsuariosApi
} from './services/usuariosApi.js'
import { useVentasStore } from '../ventas/store/useVentasStore'
import { useAuthStore } from '../../stores/useAuthStore'

const categoriasDisponibles = categorias.filter(({ id }) => id !== 'todos')
const formularioVacio = { nombre: '', categoria: 'helados', precio: '', detalle: '', imagenUrl: '' }
const formularioUsuarioVacio = { name: '', email: '', password: '', role: 'Cajero' }

function AdministracionPage() {
  const productos = useVentasStore((state) => state.productos)
  const catalogoError = useVentasStore((state) => state.errorCatalogoApi)
  const cargarCatalogoDesdeApi = useVentasStore((state) => state.cargarCatalogoDesdeApi)
  const agregarProductoCatalogo = useVentasStore((state) => state.agregarProductoCatalogo)
  const actualizarProductoCatalogo = useVentasStore((state) => state.actualizarProductoCatalogo)
  const eliminarProductoCatalogo = useVentasStore((state) => state.eliminarProductoCatalogo)
  const usuarioActual = useAuthStore((state) => state.usuario)
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false)
  const [productoEditando, setProductoEditando] = useState('')
  const [formulario, setFormulario] = useState(formularioVacio)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
  const [guardandoUsuario, setGuardandoUsuario] = useState(false)
  const [formularioUsuario, setFormularioUsuario] = useState(formularioUsuarioVacio)
  const [errorUsuarios, setErrorUsuarios] = useState('')
  const [mensajeUsuarios, setMensajeUsuarios] = useState('')

  useEffect(() => {
    if (!modalProductoAbierto) return undefined

    document.getElementById('producto-nombre')?.focus()
    function cerrarConEscape(event) {
      if (event.key !== 'Escape' || guardando) return
      setModalProductoAbierto(false)
      setProductoEditando('')
      setFormulario(formularioVacio)
      setError('')
    }

    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [guardando, modalProductoAbierto])

  useEffect(() => {
    let activo = true

    listarUsuariosApi()
      .then((lista) => {
        if (activo) {
          setUsuarios(lista)
          setErrorUsuarios('')
        }
      })
      .catch((loadError) => {
        if (activo) {
          setErrorUsuarios(loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar la lista de usuarios.')
        }
      })
      .finally(() => {
        if (activo) setCargandoUsuarios(false)
      })

    return () => {
      activo = false
    }
  }, [])

  async function recargarCatalogo() {
    setError('')
    try {
      await cargarCatalogoDesdeApi()
    } catch {
      // El store conserva el error para mostrarlo junto al catálogo.
    }
  }

  function editarProducto(producto) {
    setModalProductoAbierto(true)
    setProductoEditando(producto.id)
    setFormulario({
      nombre: producto.nombre,
      categoria: producto.categoria,
      precio: String(producto.precio),
      detalle: producto.detalle ?? '',
      imagenUrl: producto.imagenUrl ?? ''
    })
    setError('')
  }

  function cancelarEdicion() {
    setModalProductoAbierto(false)
    setProductoEditando('')
    setFormulario(formularioVacio)
    setError('')
  }

  async function guardarProducto(event) {
    event.preventDefault()
    setGuardando(true)
    setError('')

    const producto = {
      id: productoEditando || globalThis.crypto.randomUUID(),
      nombre: formulario.nombre.trim(),
      categoria: formulario.categoria,
      precio: Number(formulario.precio),
      detalle: formulario.detalle.trim(),
      imagenUrl: formulario.imagenUrl.trim()
    }

    try {
      if (productoEditando) {
        const actualizado = await actualizarProductoApi(producto)
        await actualizarProductoCatalogo(productoEditando, actualizado)
      } else {
        const creado = await crearProductoApi(producto)
        await agregarProductoCatalogo(creado)
      }

      cancelarEdicion()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el producto.')
    } finally {
      setGuardando(false)
    }
  }

  async function borrarProducto(producto) {
    if (!globalThis.confirm(`¿Eliminar "${producto.nombre}" del catálogo?`)) return

    setError('')
    try {
      await eliminarProductoApi(producto.id)
      await eliminarProductoCatalogo(producto.id)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el producto.')
    }
  }

  async function actualizarListaUsuarios() {
    setCargandoUsuarios(true)
    setErrorUsuarios('')

    try {
      setUsuarios(await listarUsuariosApi())
    } catch (loadError) {
      setErrorUsuarios(loadError instanceof Error
        ? loadError.message
        : 'No se pudo cargar la lista de usuarios.')
    } finally {
      setCargandoUsuarios(false)
    }
  }

  async function guardarUsuario(event) {
    event.preventDefault()
    setGuardandoUsuario(true)
    setErrorUsuarios('')
    setMensajeUsuarios('')

    try {
      const creado = await crearUsuarioApi(formularioUsuario)
      setUsuarios((actuales) => [...actuales, creado])
      setFormularioUsuario(formularioUsuarioVacio)
      setMensajeUsuarios(`Se creó la cuenta de ${creado.name}.`)
    } catch (createError) {
      setErrorUsuarios(createError instanceof Error
        ? createError.message
        : 'No se pudo crear la cuenta.')
    } finally {
      setGuardandoUsuario(false)
    }
  }

  async function borrarUsuario(usuario) {
    if (usuario.id === usuarioActual?.id) return
    if (!globalThis.confirm(`¿Eliminar la cuenta de ${usuario.name}?`)) return

    setErrorUsuarios('')
    setMensajeUsuarios('')

    try {
      await eliminarUsuarioApi(usuario.id)
      setUsuarios((actuales) => actuales.filter((item) => item.id !== usuario.id))
    } catch (deleteError) {
      setErrorUsuarios(deleteError instanceof Error
        ? deleteError.message
        : 'No se pudo eliminar la cuenta.')
    }
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Administración</h1>
          <p className="mt-2 text-slate-600">Gestiona el catálogo de productos disponible en ventas.</p>
        </div>
        <button
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
          onClick={() => {
            setProductoEditando('')
            setFormulario(formularioVacio)
            setError('')
            setModalProductoAbierto(true)
          }}
          type="button"
        >
          Agregar producto
        </button>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={recargarCatalogo}
          type="button"
        >
          Actualizar catálogo
        </button>
      </div>

      {((error && !modalProductoAbierto) || catalogoError) && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error || catalogoError}
        </p>
      )}

      {modalProductoAbierto && (
        <>
          <div
            aria-hidden="true"
            className="product-edit-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget && !guardando) cancelarEdicion()
            }}
          />
          <form
            aria-labelledby="producto-form-title"
            aria-modal="true"
            className="product-edit-dialog grid gap-4 md:grid-cols-2"
            onSubmit={guardarProducto}
            role="dialog"
          >
        <h2 className="text-lg font-semibold text-slate-900 md:col-span-2" id="producto-form-title">
          {productoEditando ? 'Editar producto' : 'Agregar producto'}
        </h2>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 md:col-span-2" role="alert">
            {error}
          </p>
        )}

        <label className="text-sm font-medium text-slate-700" htmlFor="producto-nombre">
          Nombre
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
            id="producto-nombre"
            maxLength={120}
            onChange={(event) => setFormulario({ ...formulario, nombre: event.target.value })}
            required
            value={formulario.nombre}
          />
        </label>

        <label className="text-sm font-medium text-slate-700" htmlFor="producto-categoria">
          Categoría
          <select
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
            id="producto-categoria"
            onChange={(event) => setFormulario({ ...formulario, categoria: event.target.value })}
            value={formulario.categoria}
          >
            {categoriasDisponibles.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700" htmlFor="producto-precio">
          Precio
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
            id="producto-precio"
            min="1"
            onChange={(event) => setFormulario({ ...formulario, precio: event.target.value })}
            required
            step="1"
            type="number"
            value={formulario.precio}
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2" htmlFor="producto-detalle">
          Descripción
          <textarea
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
            id="producto-detalle"
            maxLength={240}
            onChange={(event) => setFormulario({ ...formulario, detalle: event.target.value })}
            rows={3}
            value={formulario.detalle}
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2" htmlFor="producto-imagen">
          Foto del producto (URL pública opcional)
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
            id="producto-imagen"
            onChange={(event) => setFormulario({ ...formulario, imagenUrl: event.target.value })}
            placeholder="https://ejemplo.com/imagen-del-producto.jpg"
            type="url"
            value={formulario.imagenUrl}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Usa una URL pública HTTPS. La carga de archivos todavía no está disponible.
          </span>
          {formulario.imagenUrl && (
            <img
              alt={`Vista previa de ${formulario.nombre || 'producto'}`}
              className="mt-3 h-24 w-24 rounded-lg border border-slate-200 object-cover"
              src={formulario.imagenUrl}
            />
          )}
        </label>

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
            disabled={guardando}
            type="submit"
          >
            {guardando
              ? 'Guardando...'
              : productoEditando ? 'Confirmar cambios' : 'Confirmar producto'}
          </button>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={cancelarEdicion}
            disabled={guardando}
            type="button"
          >
            Cancelar
          </button>
        </div>
          </form>
        </>
      )}

      <section aria-labelledby="catalogo-heading" className="mt-8">
        <h2 className="text-xl font-semibold text-slate-900" id="catalogo-heading">
          Catálogo ({productos.length})
        </h2>
        {productos.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No hay productos cargados. Agrega el primer producto desde este formulario.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {productos.map((producto) => (
              <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={producto.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {producto.imagenUrl ? (
                      <img
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        src={producto.imagenUrl}
                      />
                    ) : (
                      <span aria-hidden="true" className="h-14 w-14 shrink-0 rounded-lg bg-slate-100" />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">{producto.nombre}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {categoriasDisponibles.find(({ id }) => id === producto.categoria)?.nombre}
                        {' · '}
                        {formatearPrecio(producto.precio)}
                      </p>
                      {producto.detalle && <p className="mt-1 text-sm text-slate-500">{producto.detalle}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => editarProducto(producto)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                      onClick={() => borrarProducto(producto)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="usuarios-heading" className="mt-10 border-t border-slate-200 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900" id="usuarios-heading">
              Usuarios
            </h2>
            <p className="mt-2 text-slate-600">
              Las cuentas se crean desde Administración; no hay registro público.
            </p>
          </div>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={cargandoUsuarios}
            onClick={actualizarListaUsuarios}
            type="button"
          >
            {cargandoUsuarios ? 'Actualizando...' : 'Actualizar usuarios'}
          </button>
        </div>

        {errorUsuarios && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            {errorUsuarios}
          </p>
        )}
        {mensajeUsuarios && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
            {mensajeUsuarios}
          </p>
        )}

        <form
          className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2"
          onSubmit={guardarUsuario}
        >
          <h3 className="text-lg font-semibold text-slate-900 md:col-span-2">Crear cuenta</h3>
          <label className="text-sm font-medium text-slate-700" htmlFor="usuario-nombre">
            Nombre
            <input
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="usuario-nombre"
              maxLength={120}
              onChange={(event) => setFormularioUsuario({ ...formularioUsuario, name: event.target.value })}
              required
              value={formularioUsuario.name}
            />
          </label>
          <label className="text-sm font-medium text-slate-700" htmlFor="usuario-email">
            Correo electrónico
            <input
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="usuario-email"
              onChange={(event) => setFormularioUsuario({ ...formularioUsuario, email: event.target.value })}
              required
              type="email"
              value={formularioUsuario.email}
            />
          </label>
          <label className="text-sm font-medium text-slate-700" htmlFor="usuario-password">
            Contraseña inicial
            <input
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              id="usuario-password"
              onChange={(event) => setFormularioUsuario({ ...formularioUsuario, password: event.target.value })}
              required
              type="password"
              value={formularioUsuario.password}
            />
          </label>
          <label className="text-sm font-medium text-slate-700" htmlFor="usuario-rol">
            Rol
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
              id="usuario-rol"
              onChange={(event) => setFormularioUsuario({ ...formularioUsuario, role: event.target.value })}
              value={formularioUsuario.role}
            >
              <option value="Cajero">Cajero</option>
              <option value="Administrador">Administrador</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
              disabled={guardandoUsuario}
              type="submit"
            >
              {guardandoUsuario ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900">Cuentas registradas ({usuarios.length})</h3>
          {cargandoUsuarios && usuarios.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Cargando usuarios...</p>
          ) : usuarios.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              No se encontraron cuentas para mostrar.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {usuarios.map((usuario) => (
                <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={usuario.id}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{usuario.name}</p>
                    <p className="truncate text-sm text-slate-600">{usuario.email}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      {usuario.role}
                    </p>
                  </div>
                  <button
                    aria-label={`Eliminar cuenta de ${usuario.name}`}
                    className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={usuario.id === usuarioActual?.id}
                    onClick={() => borrarUsuario(usuario)}
                    title={usuario.id === usuarioActual?.id ? 'No puedes eliminar tu propia sesión.' : undefined}
                    type="button"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </section>
  )
}

export default AdministracionPage
