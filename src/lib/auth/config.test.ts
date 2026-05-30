import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Role } from '@prisma/client'
import { hashPassword } from './password'

// Mock do Prisma usado dentro de authorize.
const findUnique = vi.fn()
vi.mock('@/lib/prisma', () => ({
  default: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}))

import { authConfig } from './config'

// Extrai a função authorize do Credentials provider.
// O NextAuth v5 embrulha `provider.authorize` num wrapper que exige um Request
// real e retorna null quando chamado direto; a lógica original (admin/FASE)
// fica preservada em `provider.options.authorize`. É essa que testamos.
type AuthorizeFn = (c: Record<string, unknown> | undefined) => Promise<unknown>
const provider = authConfig.providers[0] as unknown as {
  authorize: AuthorizeFn
  options?: { authorize?: AuthorizeFn }
}
const authorize = provider.options?.authorize ?? provider.authorize

beforeEach(() => {
  findUnique.mockReset()
  process.env.ADMIN_EMAIL = 'admin@nksart.com.br'
  delete process.env.ADMIN_PASSWORD_HASH
})

describe('authorize — admin master', () => {
  it('aceita o fallback de dev (admin123)', async () => {
    const result = await authorize({ email: 'admin@nksart.com.br', password: 'admin123' })
    expect(result).toMatchObject({ id: 'admin', role: Role.ADMIN })
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('rejeita senha de admin incorreta', async () => {
    const result = await authorize({ email: 'admin@nksart.com.br', password: 'errada' })
    expect(result).toBeNull()
  })

  it('verifica ADMIN_PASSWORD_HASH quando configurado (scrypt)', async () => {
    process.env.ADMIN_PASSWORD_HASH = await hashPassword('super-secreta')
    expect(await authorize({ email: 'admin@nksart.com.br', password: 'super-secreta' })).toMatchObject({ role: Role.ADMIN })
    expect(await authorize({ email: 'admin@nksart.com.br', password: 'admin123' })).toBeNull()
  })
})

describe('authorize — usuário do banco', () => {
  it('autentica FASE com senha correta', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      email: 'designer@equipe.com',
      name: 'Designer',
      role: Role.FASE,
      passwordHash: await hashPassword('minhaSenha8'),
    })
    const result = await authorize({ email: 'designer@equipe.com', password: 'minhaSenha8' })
    expect(result).toMatchObject({ id: 'u1', role: Role.FASE })
  })

  it('REJEITA FASE com senha errada (regressão do bypass de auth)', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      email: 'designer@equipe.com',
      name: 'Designer',
      role: Role.FASE,
      passwordHash: await hashPassword('minhaSenha8'),
    })
    const result = await authorize({ email: 'designer@equipe.com', password: 'qualquer-coisa' })
    expect(result).toBeNull()
  })

  it('rejeita usuário sem passwordHash', async () => {
    findUnique.mockResolvedValue({
      id: 'u1', email: 'designer@equipe.com', name: null, role: Role.FASE, passwordHash: null,
    })
    expect(await authorize({ email: 'designer@equipe.com', password: 'x' })).toBeNull()
  })

  it('rejeita usuário VISITOR mesmo com senha válida', async () => {
    findUnique.mockResolvedValue({
      id: 'u2', email: 'visitante@x.com', name: null, role: Role.VISITOR,
      passwordHash: await hashPassword('senha1234'),
    })
    expect(await authorize({ email: 'visitante@x.com', password: 'senha1234' })).toBeNull()
  })

  it('retorna null quando faltam credenciais', async () => {
    expect(await authorize({ email: '', password: '' })).toBeNull()
    expect(await authorize(undefined)).toBeNull()
  })
})
