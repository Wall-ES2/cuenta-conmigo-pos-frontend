import { apiRequest } from '../../../services/apiClient.js'

const rolesPermitidos = new Set(['Administrador', 'Cajero'])

export async function listarUsuariosApi() {
  const response = await apiRequest('/users')

  if (!Array.isArray(response)) {
    throw new Error('El backend debe devolver una lista de usuarios en /users.')
  }

  return response.map(normalizarUsuario)
}

export async function crearUsuarioApi(usuario) {
  const response = await apiRequest('/users', {
    method: 'POST',
    body: {
      name: [usuario.nombre, usuario.apellido].map((parte) => parte.trim()).filter(Boolean).join(" "),
      firstName: usuario.nombre.trim(),
      lastName: usuario.apellido.trim(),
      dni: usuario.dni.trim(),
      email: usuario.email.trim(),
      password: usuario.password,
      role: usuario.role
    }
  })

  return normalizarUsuario(response)
}

export async function eliminarUsuarioApi(id) {
  await apiRequest(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function normalizarUsuario(usuario) {
  if (
    !usuario
    || typeof usuario.id !== 'string'
    || typeof usuario.name !== 'string'
    || typeof usuario.email !== 'string'
    || !rolesPermitidos.has(usuario.role)
  ) {
    throw new Error('El backend devolvió un usuario con campos o rol inválidos.')
  }

  return {
    id: usuario.id,
    name: usuario.name,
    email: usuario.email,
    role: usuario.role,
    ...(typeof usuario.firstName === "string" ? { nombre: usuario.firstName } : {}),
    ...(typeof usuario.lastName === "string" ? { apellido: usuario.lastName } : {}),
    ...(typeof usuario.dni === "string" ? { dni: usuario.dni } : {}),
  }
}
