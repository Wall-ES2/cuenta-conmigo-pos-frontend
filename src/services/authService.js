import {
  apiRequest,
  publicApiRequest,
  refreshAccessToken,
  validateSessionTokens
} from './apiClient.js'
import {
  clearSessionTokens,
  getRefreshToken,
  setSessionTokens
} from './sessionTokens.js'

export async function iniciarSesion(email, password) {
  const session = await publicApiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  })

  if (!session?.user) {
    throw new Error('La respuesta de inicio de sesión no incluyó el usuario.')
  }

  validateSessionTokens(session)
  setSessionTokens(session)
  return session.user
}

export async function restaurarSesion() {
  if (!getRefreshToken()) return null

  await refreshAccessToken()
  const response = await apiRequest('/auth/me')
  return response?.user ?? response
}

export async function cerrarSesion() {
  const refreshToken = getRefreshToken()
  let requestError

  if (refreshToken) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        skipRefresh: true
      })
    } catch (error) {
      requestError = error
    }
  }

  clearSessionTokens()

  if (requestError) {
    throw new Error(`Se cerró la sesión local, pero el backend no confirmó el cierre: ${requestError.message}`)
  }
}
