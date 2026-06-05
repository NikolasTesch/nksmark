import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, rateLimitMock } = vi.hoisted(() => ({
  prismaMock: { user: { findUnique: vi.fn(), create: vi.fn() } },
  rateLimitMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: () => rateLimitMock(),
  getClientIp: () => Promise.resolve('127.0.0.1'),
}))

import { POST } from './route'

function postReq(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  rateLimitMock.mockReturnValue({ success: true })
  prismaMock.user.findUnique.mockResolvedValue(null)
  prismaMock.user.create.mockResolvedValue({ id: 'user-1' })
})

describe('POST /api/auth/register', () => {
  it('rejeita senha fraca', async () => {
    const res = await POST(postReq({ name: 'Ana', email: 'ana@x.com', password: '123' }))
    expect(res.status).toBe(400)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('rejeita e-mail inválido', async () => {
    const res = await POST(postReq({ name: 'Ana', email: 'nope', password: 'senhaforte123' }))
    expect(res.status).toBe(400)
  })

  it('retorna 409 para e-mail já cadastrado', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existe' })
    const res = await POST(postReq({ name: 'Ana', email: 'ana@x.com', password: 'senhaforte123' }))
    expect(res.status).toBe(409)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('cria conta CLIENT com senha hasheada', async () => {
    const res = await POST(postReq({ name: 'Ana', email: 'ANA@x.com', password: 'senhaforte123' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.data.id).toBe('user-1')

    const arg = prismaMock.user.create.mock.calls[0][0]
    expect(arg.data.role).toBe('CLIENT')
    expect(arg.data.email).toBe('ana@x.com') // normalizado para minúsculas
    expect(arg.data.passwordHash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/) // formato scrypt salt:key
  })
})
