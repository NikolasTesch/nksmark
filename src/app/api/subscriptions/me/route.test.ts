import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, authMock } = vi.hoisted(() => ({
  prismaMock: {
    subscription: { findUnique: vi.fn() },
  },
  authMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/auth', () => ({ auth: (...a: unknown[]) => authMock(...a) }))

import { GET } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.MP_ACERVO_AMOUNT_CENTS = '2990'
})

describe('GET /api/subscriptions/me', () => {
  it('exige login (401 sem sessão)', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/subscriptions/me'))
    expect(res.status).toBe(401)
  })

  it('retorna null quando não há assinatura (mas traz o plano)', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.subscription.findUnique.mockResolvedValue(null)

    const res = await GET(new Request('http://localhost/api/subscriptions/me'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.subscription).toBeNull()
    expect(json.data.plan).toEqual({ amountCents: 2990, currency: 'BRL', interval: 'month' })
  })

  it('retorna estado da assinatura existente', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.subscription.findUnique.mockResolvedValue({
      status: 'authorized',
      currentPeriodEnd: new Date('2026-11-01T00:00:00.000Z'),
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
    })

    const res = await GET(new Request('http://localhost/api/subscriptions/me'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.subscription).toEqual({
      status: 'authorized',
      currentPeriodEnd: '2026-11-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
    })
  })
})
