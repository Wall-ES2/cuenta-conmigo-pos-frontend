import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizarUsuario } from './usuariosApi.js'

describe('normalizarUsuario', () => {
  it('acepta usuarios con los roles definidos para el POS', () => {
    assert.deepEqual(normalizarUsuario({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.test',
      role: 'Cajero'
    }), {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.test',
      role: 'Cajero'
    })
  })

  it('rechaza usuarios con roles fuera del contrato', () => {
    assert.throws(
      () => normalizarUsuario({
        id: 'user-1',
        name: 'Ana',
        email: 'ana@example.test',
        role: 'Invitado'
      }),
      /campos o rol inválidos/
    )
  })
})
