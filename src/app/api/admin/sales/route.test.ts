import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OrderStatus } from '@prisma/client'

const { prismaMock, protectAdminRouteMock } = vi.hoisted(() => ({
  prismaMock: { order: { findMany: vi.fn() } },
  protectAdminRouteMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({
  protectAdminRoute: () => protectAdminRouteMock(),
}))

import { GET } from './route'

function getReq(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/admin/sales')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

function makeOrder(overrides: object = {}) {
  return {
    id: 'order-1',
    amountCents: 1500,
    paidAt: new Date('2026-06-10T12:00:00Z'),
    status: OrderStatus.PAID,
    userId: 'user-1',
    user: { id: 'user-1', name: 'João', email: 'joao@x.com' },
    artwork: {
      id: 'art-1',
      title: 'Arte A',
      category: { id: 'cat-1', name: 'Categoria X', color: '#ff0000' },
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  protectAdminRouteMock.mockResolvedValue({
    authorized: true,
    response: null,
    user: { id: 'admin-1', role: 'ADMIN' },
  })
  prismaMock.order.findMany.mockResolvedValue([])
})

describe('GET /api/admin/sales', () => {
  it('retorna 403 para não-admin', async () => {
    protectAdminRouteMock.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 }),
    })
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('retorna stats zerados quando não há pedidos', async () => {
    prismaMock.order.findMany.mockResolvedValue([])
    const res = await GET(getReq())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.stats.totalRevenueCents).toBe(0)
    expect(json.data.stats.totalSales).toBe(0)
    expect(json.data.stats.avgTicketCents).toBe(0)
    expect(json.data.stats.totalClients).toBe(0)
    expect(json.data.topArtworks).toHaveLength(0)
    expect(json.data.categoryDistribution).toHaveLength(0)
  })

  it('calcula receita, ticket médio e clientes únicos corretamente', async () => {
    const orders = [
      makeOrder({ id: 'o1', amountCents: 1500, userId: 'u1', user: { id: 'u1', name: 'A', email: 'a@x.com' } }),
      makeOrder({ id: 'o2', amountCents: 2000, userId: 'u2', user: { id: 'u2', name: 'B', email: 'b@x.com' } }),
      makeOrder({ id: 'o3', amountCents: 1500, userId: 'u1', user: { id: 'u1', name: 'A', email: 'a@x.com' }, artwork: { id: 'art-2', title: 'Arte B', category: { id: 'cat-1', name: 'Categoria X', color: '#ff0000' } } }),
    ]
    prismaMock.order.findMany
      .mockResolvedValueOnce(orders)
      .mockResolvedValueOnce([])

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.data.stats.totalRevenueCents).toBe(5000)
    expect(json.data.stats.totalSales).toBe(3)
    expect(json.data.stats.avgTicketCents).toBe(Math.round(5000 / 3))
    expect(json.data.stats.totalClients).toBe(2)
  })

  it('calcula percentChangeFromPrevMonth corretamente', async () => {
    const currentOrders = [makeOrder({ amountCents: 3000 })]
    const prevOrders = [{ amountCents: 1500 }]

    prismaMock.order.findMany
      .mockResolvedValueOnce(currentOrders)
      .mockResolvedValueOnce(prevOrders)

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.data.stats.percentChangeFromPrevMonth).toBe(100)
  })

  it('retorna 100% de variação quando mês anterior não tem receita', async () => {
    prismaMock.order.findMany
      .mockResolvedValueOnce([makeOrder({ amountCents: 1500 })])
      .mockResolvedValueOnce([])

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.data.stats.percentChangeFromPrevMonth).toBe(100)
  })

  it('usa year/month da query string para filtrar datas', async () => {
    prismaMock.order.findMany.mockResolvedValue([])
    await GET(getReq({ year: '2025', month: '3' }))

    const firstCall = prismaMock.order.findMany.mock.calls[0][0]
    const startDate: Date = firstCall.where.paidAt.gte
    const endDate: Date = firstCall.where.paidAt.lte

    expect(startDate.getFullYear()).toBe(2025)
    expect(startDate.getMonth()).toBe(2)
    expect(endDate.getMonth()).toBe(2)
  })

  it('constrói topArtworks ordenado por quantidade de vendas', async () => {
    const orders = [
      makeOrder({ id: 'o1', artwork: { id: 'art-1', title: 'Arte A', category: { id: 'cat-1', name: 'Cat', color: null } } }),
      makeOrder({ id: 'o2', artwork: { id: 'art-1', title: 'Arte A', category: { id: 'cat-1', name: 'Cat', color: null } } }),
      makeOrder({ id: 'o3', artwork: { id: 'art-2', title: 'Arte B', category: { id: 'cat-1', name: 'Cat', color: null } } }),
    ]
    prismaMock.order.findMany
      .mockResolvedValueOnce(orders)
      .mockResolvedValueOnce([])

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.data.topArtworks[0].id).toBe('art-1')
    expect(json.data.topArtworks[0].count).toBe(2)
    expect(json.data.topArtworks[1].id).toBe('art-2')
  })

  it('recentOrders limita a 12 registros', async () => {
    const orders = Array.from({ length: 15 }, (_, i) =>
      makeOrder({ id: `o${i}`, paidAt: new Date(`2026-06-${String(i + 1).padStart(2, '0')}T00:00:00Z`) })
    )
    prismaMock.order.findMany
      .mockResolvedValueOnce(orders)
      .mockResolvedValueOnce([])

    const res = await GET(getReq())
    const json = await res.json()

    expect(json.data.recentOrders).toHaveLength(12)
  })
})
