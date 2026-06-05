import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Status } from '@prisma/client'

const { prismaMock, authMock, rateLimitMock, createPreferenceMock } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { findUnique: vi.fn() },
    order: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
  authMock: vi.fn(),
  rateLimitMock: vi.fn(),
  createPreferenceMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/auth', () => ({ auth: () => authMock() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => rateLimitMock() }))
vi.mock('@/lib/payments/mercadopago', () => ({ createPreference: (...a: unknown[]) => createPreferenceMock(...a) }))

import { POST } from './route'

function postReq(body: unknown) {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'cliente-1', role: 'CLIENT', email: 'c@x.com' } })
  rateLimitMock.mockReturnValue({ success: true })
  createPreferenceMock.mockResolvedValue({ preferenceId: 'pref-1', initPoint: 'https://mp/checkout/pref-1' })
  prismaMock.order.findFirst.mockResolvedValue(null)
  prismaMock.order.create.mockResolvedValue({ id: 'order-1' })
  prismaMock.order.update.mockResolvedValue({ id: 'order-1' })
})

describe('POST /api/orders', () => {
  it('exige login', async () => {
    authMock.mockResolvedValue(null)
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(401)
  })

  it('bloqueia quem não é cliente (equipe não compra)', async () => {
    authMock.mockResolvedValue({ user: { id: 'fase-1', role: 'FASE', email: 'f@x.com' } })
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(403)
  })

  it('recusa arte gratuita', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue({ id: 'art-1', title: 'Free', status: Status.PUBLISHED, isFree: true, priceCents: 0 })
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(400)
  })

  it('retorna 404 para arte inexistente ou não publicada', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue(null)
    expect((await POST(postReq({ artworkId: 'art-1' }))).status).toBe(404)

    prismaMock.artwork.findUnique.mockResolvedValue({ id: 'art-1', title: 'X', status: Status.DRAFT, isFree: false, priceCents: 1500 })
    expect((await POST(postReq({ artworkId: 'art-1' }))).status).toBe(404)
  })

  it('bloqueia recompra quando já existe pedido pago', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue({ id: 'art-1', title: 'X', status: Status.PUBLISHED, isFree: false, priceCents: 1500 })
    prismaMock.order.findFirst.mockResolvedValue({ id: 'pago-1' })
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(409)
    expect(prismaMock.order.create).not.toHaveBeenCalled()
  })

  it('cria o pedido com o preço do banco e devolve o initPoint', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue({ id: 'art-1', title: 'Arte Paga', status: Status.PUBLISHED, isFree: false, priceCents: 2990 })

    const res = await POST(postReq({ artworkId: 'art-1' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.initPoint).toBe('https://mp/checkout/pref-1')
    // Preço lido do banco (snapshot), não do cliente.
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountCents: 2990, userId: 'cliente-1', artworkId: 'art-1' }) })
    )
    expect(createPreferenceMock).toHaveBeenCalledWith(expect.objectContaining({ unitPrice: 29.9 }))
  })

  it('marca o pedido como FAILED se a preference falhar', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue({ id: 'art-1', title: 'X', status: Status.PUBLISHED, isFree: false, priceCents: 1500 })
    createPreferenceMock.mockRejectedValue(new Error('mp down'))

    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(502)
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
    )
  })
})
