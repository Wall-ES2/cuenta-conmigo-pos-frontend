import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  ApiError,
  apiRequest,
  publicApiRequest,
  refreshAccessToken
} from './apiClient.js'
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  setSessionTokens
} from './sessionTokens.js'

const almacenamientoAnterior = globalThis.sessionStorage

function prepararAlmacenamientoSesion() {
  const tokens = new Map()
  globalThis.sessionStorage = {
    getItem: (key) => tokens.get(key) ?? null,
    setItem: (key, value) => tokens.set(key, value),
    removeItem: (key) => tokens.delete(key)
  }
}

afterEach(() => {
  clearSessionTokens()
  if (almacenamientoAnterior === undefined) {
    delete globalThis.sessionStorage
  } else {
    globalThis.sessionStorage = almacenamientoAnterior
  }
})

describe('apiClient', () => {
  it('guarda el access token en memoria y el refresh token solo en sessionStorage', () => {
    prepararAlmacenamientoSesion()
    setSessionTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' })

    assert.equal(getAccessToken(), 'access-1')
    assert.equal(getRefreshToken(), 'refresh-1')
  })

  it('coordina una sola renovación para varias respuestas 401 y reintenta una vez', async () => {
    prepararAlmacenamientoSesion()
    setSessionTokens({ accessToken: 'access-expirado', refreshToken: 'refresh-1' })
    let renovaciones = 0

    const fetchImpl = async (url, options) => {
      if (url.endsWith('/auth/refresh')) {
        renovaciones += 1
        await new Promise((resolve) => setTimeout(resolve, 5))
        return Response.json({
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          user: { role: 'Administrador' }
        })
      }

      if (options.headers.get('Authorization') === 'Bearer access-expirado') {
        return Response.json({ message: 'Token vencido' }, { status: 401 })
      }

      return Response.json({ ok: true })
    }

    const results = await Promise.all([
      apiRequest('/products', { baseUrl: 'https://api.example.test', fetchImpl }),
      apiRequest('/auth/me', { baseUrl: 'https://api.example.test', fetchImpl })
    ])

    assert.equal(renovaciones, 1)
    assert.equal(getAccessToken(), 'access-2')
    assert.equal(getRefreshToken(), 'refresh-2')
    assert.deepEqual(results, [{ ok: true }, { ok: true }])
  })

  it('limpia los tokens cuando falla la renovación', async () => {
    prepararAlmacenamientoSesion()
    setSessionTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' })

    await assert.rejects(
      refreshAccessToken({
        baseUrl: 'https://api.example.test',
        fetchImpl: async () => Response.json({ message: 'Refresh inválido' }, { status: 401 })
      }),
      (error) => error instanceof ApiError && error.status === 401
    )

    assert.equal(getAccessToken(), '')
    assert.equal(getRefreshToken(), '')
  })

  it('expone errores HTTP del backend y representa correctamente una respuesta 204', async () => {
    await assert.rejects(
      publicApiRequest('/auth/login', {
        baseUrl: 'https://api.example.test',
        fetchImpl: async () => Response.json({ message: 'Credenciales inválidas' }, { status: 401 })
      }),
      (error) => error instanceof ApiError && error.message === 'Credenciales inválidas'
    )

    assert.equal(await publicApiRequest('/products/item', {
      baseUrl: 'https://api.example.test',
      fetchImpl: async () => new Response(null, { status: 204 })
    }), null)
  })
})
