import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  setSessionTokens
} from './sessionTokens.js'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

let refreshInFlight

export function getApiBaseUrl() {
  const baseUrl = import.meta.env?.VITE_API_BASE_URL?.trim()

  if (!baseUrl) {
    throw new Error('Falta configurar VITE_API_BASE_URL para conectarse al backend.')
  }

  return baseUrl.replace(/\/+$/, '')
}

export async function publicApiRequest(path, options = {}) {
  return sendRequest(path, options)
}

export async function apiRequest(path, options = {}) {
  const { skipRefresh = false, ...requestOptions } = options
  const token = getAccessToken()
  const headers = new Headers(requestOptions.headers ?? {})

  if (token) headers.set('Authorization', `Bearer ${token}`)

  try {
    return await sendRequest(path, { ...requestOptions, headers })
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || skipRefresh) throw error

    await refreshAccessToken({
      baseUrl: requestOptions.baseUrl,
      fetchImpl: requestOptions.fetchImpl
    })
    return apiRequest(path, { ...requestOptions, skipRefresh: true })
  }
}

export async function refreshAccessToken({ baseUrl, fetchImpl } = {}) {
  if (refreshInFlight) return refreshInFlight

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearSessionTokens()
    throw new Error('La sesión venció. Inicia sesión nuevamente.')
  }

  refreshInFlight = (async () => {
    try {
      const session = await sendRequest('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        baseUrl,
        fetchImpl
      })

      validateSessionTokens(session)
      setSessionTokens(session)
      return session
    } catch (error) {
      clearSessionTokens()
      throw error
    } finally {
      refreshInFlight = undefined
    }
  })()

  return refreshInFlight
}

async function sendRequest(path, options = {}) {
  const {
    body,
    headers: suppliedHeaders,
    baseUrl = getApiBaseUrl(),
    fetchImpl = fetch,
    ...init
  } = options
  const headers = new Headers(suppliedHeaders ?? {})

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response

  try {
    response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}${path}`, {
      ...init,
      headers,
      body: body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body)
    })
  } catch (error) {
    throw new Error(`No se pudo conectar con el backend: ${error.message}`, { cause: error })
  }

  const responseBody = await readResponseBody(response)
  if (!response.ok) {
    const message = typeof responseBody?.message === 'string'
      ? responseBody.message
      : `La API respondió con estado ${response.status}.`
    throw new ApiError(message, response.status, responseBody)
  }

  return responseBody
}

async function readResponseBody(response) {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('El backend devolvió una respuesta que no es JSON válido.')
  }
}

export function validateSessionTokens(session) {
  if (
    !session
    || typeof session.accessToken !== 'string'
    || typeof session.refreshToken !== 'string'
    || !session.accessToken
    || !session.refreshToken
  ) {
    throw new Error('La respuesta de autenticación debe incluir accessToken y refreshToken.')
  }
}
