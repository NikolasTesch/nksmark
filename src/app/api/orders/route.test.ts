import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Status } from '@prisma/client'

const { prismaMock, authMock, rateLimitMock, createPreferenceMock } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { findUnique: vi.fn(), findMany: vi.fn() },
    order: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    orderItem: { findFirst: vi.fn() },
    cart: { findUnique: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    coupon: { findUnique: vi.fn() },
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
  prismaMock.orderItem.findFirst.mockResolvedValue(null)
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
    prismaMock.artwork.findMany.mockResolvedValue([{ id: 'art-1', title: 'Free', status: Status.PUBLISHED, isFree: true, priceCents: 0 }])
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(400)
  })

  it('retorna 404 para arte inexistente ou não publicada', async () => {
    prismaMock.artwork.findMany.mockResolvedValue([])
    expect((await POST(postReq({ artworkId: 'art-1' }))).status).toBe(404)

    prismaMock.artwork.findMany.mockResolvedValue([{ id: 'art-1', title: 'X', status: Status.DRAFT, isFree: false, priceCents: 1500 }])
    expect((await POST(postReq({ artworkId: 'art-1' }))).status).toBe(404)
  })

  it('bloqueia recompra quando já existe pedido pago', async () => {
    prismaMock.artwork.findMany.mockResolvedValue([{ id: 'art-1', title: 'X', status: Status.PUBLISHED, isFree: false, priceCents: 1500 }])
    prismaMock.orderItem.findFirst.mockResolvedValue({ id: 'pago-1' })
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(409)
    expect(prismaMock.order.create).not.toHaveBeenCalled()
  })

  it('cria o pedido com o preço do banco e devolve o initPoint', async () => {
    prismaMock.artwork.findMany.mockResolvedValue([{ id: 'art-1', title: 'Arte Paga', status: Status.PUBLISHED, isFree: false, priceCents: 2990 }])

    const res = await POST(postReq({ artworkId: 'art-1' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.initPoint).toBe('https://mp/checkout/pref-1')
    // Preço lido do banco (snapshot), não do cliente.
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountCents: 2990, userId: 'cliente-1', artworkId: 'art-1' }) })
    )
    expect(createPreferenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ unitPrice: 29.9 }),
        ]),
      })
    )
  })

  it('marca o pedido como FAILED se a preference falhar', async () => {
    prismaMock.artwork.findMany.mockResolvedValue([{ id: 'art-1', title: 'X', status: Status.PUBLISHED, isFree: false, priceCents: 1500 }])
    createPreferenceMock.mockRejectedValue(new Error('mp down'))

    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(502)
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
    )
  })

  // ── Multi-item ──────────────────────────────────────────────

  it('cria pedido multi-item via artworkIds', async () => {
    prismaMock.artwork.findMany.mockResolvedValue([
      { id: 'art-1', title: 'Arte 1', status: Status.PUBLISHED, isFree: false, priceCents: 1000 },
      { id: 'art-2', title: 'Arte 2', status: Status.PUBLISHED, isFree: false, priceCents: 2000 },
    ])

    const res = await POST(postReq({ artworkIds: ['art-1', 'art-2'] }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.initPoint).toBe('https://mp/checkout/pref-1')
    // O amount total é a soma dos dois (1000 + 2000 = 3000 centavos)
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 3000, artworkId: undefined }),
      })
    )
    // Ambos os itens são passados para createPreference
    expect(createPreferenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ unitPrice: 10 }),
          expect.objectContaining({ unitPrice: 20 }),
        ]),
      })
    )
    // Carrinho é limpo após sucesso
    expect(prismaMock.cartItem.deleteMany).toHaveBeenCalled()
  })

  // ── Cart-based checkout ────────────────────────────────────

  it('checkout via carrinho (sem artworkId) carrega itens do cart', async () => {
    prismaMock.artwork.findMany.mockResolvedValue([
      { id: 'art-1', title: 'Cart Art 1', status: Status.PUBLISHED, isFree: false, priceCents: 1500 },
    ])
    prismaMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [{ id: 'ci-1', artworkId: 'art-1' }],
    })

    const res = await POST(postReq({}))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.initPoint).toBe('https://mp/checkout/pref-1')
    expect(prismaMock.cart.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'cliente-1' } })
    )
    // Carrinho é limpo após sucesso
    expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cart: { userId: 'cliente-1' }, artworkId: { in: ['art-1'] } } })
    )
  })

  it('checkout via carrinho com cupom', async () => {
    prismaMock.artwork.findMany.mockResolvedValue([
      { id: 'art-1', title: 'A', status: Status.PUBLISHED, isFree: false, priceCents: 2000 },
    ])
    prismaMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [{ id: 'ci-1', artworkId: 'art-1' }],
    })
    // Simula cupom de 10% (200 centavos de desconto → 1800 no total)
    prismaMock.coupon.findUnique.mockResolvedValue({ id: 'cup-1', isActive: true, expiresAt: null, maxUses: null, usedCount: 0, minPurchaseCents: null, discountType: 'PERCENTAGE', discountValue: 10 })

    const res = await POST(postReq({ couponCode: 'DESC10' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.initPoint).toBe('https://mp/checkout/pref-1')
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 1800, couponId: 'cup-1' }),
      })
    )
  })

  it('recusa carrinho vazio (sem itens)', async () => {
    prismaMock.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] })

    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Carrinho vazio')
  })

  it('recusa carrinho inexistente', async () => {
    prismaMock.cart.findUnique.mockResolvedValue(null)

    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Carrinho vazio')
  })
})
