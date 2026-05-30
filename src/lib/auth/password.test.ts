import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, isHashed } from './password'

describe('password hashing (scrypt)', () => {
  it('gera hashes no formato "salt:key" e diferentes a cada chamada', async () => {
    const a = await hashPassword('segredo123')
    const b = await hashPassword('segredo123')

    expect(a).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)
    expect(a).not.toBe(b) // salt aleatório → hashes distintos
  })

  it('verifica a senha correta', async () => {
    const hash = await hashPassword('senhaForte!')
    await expect(verifyPassword('senhaForte!', hash)).resolves.toBe(true)
  })

  it('rejeita senha incorreta', async () => {
    const hash = await hashPassword('senhaForte!')
    await expect(verifyPassword('senhaErrada', hash)).resolves.toBe(false)
  })

  it('rejeita quando o hash é nulo/indefinido/malformado', async () => {
    await expect(verifyPassword('x', null)).resolves.toBe(false)
    await expect(verifyPassword('x', undefined)).resolves.toBe(false)
    await expect(verifyPassword('x', 'sem-dois-pontos')).resolves.toBe(false)
    await expect(verifyPassword('x', '')).resolves.toBe(false)
  })
})

describe('isHashed', () => {
  it('reconhece hash scrypt válido', async () => {
    const hash = await hashPassword('abc')
    expect(isHashed(hash)).toBe(true)
  })

  it('rejeita texto puro', () => {
    expect(isHashed('admin123')).toBe(false)
    expect(isHashed('nao:hex!')).toBe(false)
  })
})
