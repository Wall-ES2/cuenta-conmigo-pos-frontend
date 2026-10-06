const REFRESH_TOKEN_KEY = 'cuenta-conmigo-refresh-token'
let accessToken = ''

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token) {
  accessToken = token
}

export function getRefreshToken() {
  return globalThis.sessionStorage?.getItem(REFRESH_TOKEN_KEY) ?? ''
}

export function setSessionTokens({ accessToken: nextAccessToken, refreshToken }) {
  if (!nextAccessToken || !refreshToken) {
    throw new Error('La respuesta de autenticación no incluyó ambos tokens.')
  }

  try {
    globalThis.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } catch (error) {
    accessToken = ''
    throw new Error(`No se pudo guardar la sesión en esta pestaña: ${error.message}`, { cause: error })
  }

  accessToken = nextAccessToken
}

export function clearSessionTokens() {
  accessToken = ''

  try {
    globalThis.sessionStorage?.removeItem(REFRESH_TOKEN_KEY)
  } catch (error) {
    throw new Error(`No se pudo limpiar el token de renovación: ${error.message}`, { cause: error })
  }
}
