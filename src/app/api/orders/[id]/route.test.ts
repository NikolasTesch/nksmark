import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OrderStatus, Role } from '@prisma/client'

const { prismaMock, authMock } = vi.hoisted(() => ({
  prismaMock: { order: { findUnique: vi.fn() } },
  authMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/auth', () => ({ auth: () => authMock() }))

import { GET } from './route'

function getReq(id: string) {
  return new Request(`http://localhost/api/orders/${id}`)
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  status: OrderStatus.PAID,
  amountCents: 1500,
  paidAt: new Date('2026-06-10T12:00:00Z'),
  artwork: { id: 'art-1', title: 'Arte Teste', slug: 'arte-teste' },
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'user-1', role: Role.CLIENT } })
  prismaMock.order.findUnique.mockResolvedValue(mockOrder)
})

describe('GET /api/orders/[id]', () => {
  it('retorna 401 para usuário não autenticado', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(getReq('order-1'), makeParams('order-1'))
    expect(res.status).toBe(401)
  })

  it('retorna 404 para pedido não encontrado', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)
    const res = await GET(getReq('nao-existe'), makeParams('nao-existe'))
    expect(res.status).toBe(404)
  })

  it('retorna 404 quando o pedido pertence a outro usuário (proteção de visibilidade)', async () => {
    authMock.mockResolvedValue({ user: { id: 'outro-user', role: Role.CLIENT } })
    const res = await GET(getReq('order-1'), makeParams('order-1'))
    expect(res.status).toBe(404)
  })

  it('retorna 200 com dados do pedido para o dono', async () => {
    const res = await GET(getReq('order-1'), makeParams('order-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('order-1')
    expect(json.data.status).toBe(OrderStatus.PAID)
    expect(json.data.amountCents).toBe(1500)
    expect(json.data.artwork.slug).toBe('arte-teste')
  })

  it('admin pode consultar pedido de qualquer cliente', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: Role.ADMIN } })
    const res = await GET(getReq('order-1'), makeParams('order-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.id).toBe('order-1')
  })

  it('paidAt é retornado como string ISO ou null', async () => {
    const res = await GET(getReq('order-1'), makeParams('order-1'))
    const json = await res.json()

    expect(typeof json.data.paidAt).toBe('string')
  })

  it('retorna null para paidAt quando pedido ainda está PENDING', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...mockOrder,
      status: OrderStatus.PENDING,
      paidAt: null,
    })
    const res = await GET(getReq('order-1'), makeParams('order-1'))
    const json = await res.json()

    expect(json.data.paidAt).toBeNull()
  })
})
