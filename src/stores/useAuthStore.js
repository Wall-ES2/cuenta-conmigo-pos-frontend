import { create } from 'zustand'
import { cerrarSesion, iniciarSesion, restaurarSesion } from '../services/authService.js'
import { clearSessionTokens } from '../services/sessionTokens.js'

const rolesValidos = new Set(['Administrador', 'Cajero'])
let inicializacionEnCurso

function validarUsuario(user) {
  if (!user || typeof user !== 'object' || !rolesValidos.has(user.role)) {
    throw new Error('El backend devolvió un rol no permitido para esta aplicación.')
  }

  return user
}

export const useAuthStore = create((set) => ({
  usuario: null,
  inicializando: true,
  error: '',
  procesando: false,

  inicializar: () => {
    if (inicializacionEnCurso) return inicializacionEnCurso
    set({ inicializando: true, error: '' })

    inicializacionEnCurso = (async () => {
      try {
        const user = await restaurarSesion()
        set({ usuario: user ? validarUsuario(user) : null, inicializando: false })
      } catch (error) {
        let errorSesion = error instanceof Error ? error.message : 'No se pudo restaurar la sesión.'
        try {
          clearSessionTokens()
        } catch (clearError) {
          errorSesion = `${errorSesion} ${clearError.message}`
        }
        set({ usuario: null, inicializando: false, error: errorSesion })
      } finally {
        inicializacionEnCurso = undefined
      }
    })()

    return inicializacionEnCurso
  },

  login: async (email, password) => {
    set({ procesando: true, error: '' })

    try {
      const user = validarUsuario(await iniciarSesion(email, password))
      set({ usuario: user, procesando: false, error: '' })
      return user
    } catch (error) {
      let message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
      try {
        clearSessionTokens()
      } catch (clearError) {
        message = `${message} ${clearError.message}`
      }
      set({ procesando: false, error: message })
      throw error
    }
  },

  logout: async () => {
    set({ usuario: null, error: '' })

    try {
      await cerrarSesion()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo confirmar el cierre de sesión.'
      set({ error: message })
      throw error
    }
  }
}))
