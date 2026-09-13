import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, protectAdminRouteMock, createRefundMock, MercadoPagoRefundError } = vi.hoisted(() => {
  // Classe espelho da real — o mock a exporta para que o `instanceof` na rota
  // e o throw no teste compartilhem o mesmo construtor.
  class MercadoPagoRefundError extends Error {
    status: number
    causeCodes: number[]
    raw: string
    constructor(status: number, causeCodes: number[], raw = '') {
      super('')
      this.status = status
      this.causeCodes = causeCodes
      this.raw = raw
    }
  }
  return {
    prismaMock: {
      order: { findUnique: vi.fn(), updateMany: vi.fn() },
    },
    protectAdminRouteMock: vi.fn(),
    createRefundMock: vi.fn(),
    MercadoPagoRefundError,
  }
})

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({
  protectAdminRoute: () => protectAdminRouteMock(),
}))
vi.mock('@/lib/payments/mercadopago', () => ({
  createRefund: (...a: unknown[]) => createRefundMock(...a),
  MercadoPagoRefundError,
}))

import { POST } from './route'

const paidOrder = { id: 'order-1', status: 'PAID', mpPaymentId: 'pay-99' }

function refundReq(id = 'order-1') {
  return new Request(`http://localhost/api/admin/orders/${id}/refund`, { method: 'POST' })
}

function makeParams(id = 'order-1') {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  protectAdminRouteMock.mockResolvedValue({
    authorized: true,
    response: null,
    user: { id: 'admin-1', role: 'ADMIN' },
  })
  prismaMock.order.updateMany.mockResolvedValue({ count: 1 })
})

describe('POST /api/admin/orders/[id]/refund', () => {
  it('estorna pedido PAID com mpPaymentId e marca REFUNDED (approved)', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...paidOrder })
    createRefundMock.mockResolvedValue({ refundId: 'ref-1', status: 'approved' })

    const res = await POST(refundReq(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ ok: true, status: 'refunded' })
    expect(createRefundMock).toHaveBeenCalledWith('pay-99')
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1', status: 'PAID' },
        data: expect.objectContaining({ status: 'REFUNDED', mpRefundId: 'ref-1', refundedById: 'admin-1' }),
      }),
    )
  })

  it('mantém PAID e sinaliza refundPending quando MP responde in_process (Pix)', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...paidOrder })
    createRefundMock.mockResolvedValue({ refundId: 'ref-2', status: 'in_process' })

    const res = await POST(refundReq(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ ok: true, status: 'refund_pending' })
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PAID' }),
        data: expect.objectContaining({ refundPending: true }),
      }),
    )
  })

  it('retorna 409 quando o pedido não tem mpPaymentId / não está PAID', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'PAID', mpPaymentId: null })

    const res = await POST(refundReq(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.success).toBe(false)
    expect(createRefundMock).not.toHaveBeenCalled()
  })

  it('consolida REFUNDED localmente quando o MP já havia estornado (4296)', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...paidOrder })
    createRefundMock.mockRejectedValue(new MercadoPagoRefundError(404, [4296]))

    const res = await POST(refundReq(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ ok: true, status: 'refunded' })
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1', status: 'PAID' },
        data: expect.objectContaining({ status: 'REFUNDED', refundPending: false }),
      }),
    )
  })

  it('mapeia erro 2063 do MP para 400 com mensagem legível', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...paidOrder })
    createRefundMock.mockRejectedValue(new MercadoPagoRefundError(400, [2063]))

    const res = await POST(refundReq(), makeParams())
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.message).toMatch(/estado válido/i)
  })

  it('replay idempotente: pedido já REFUNDED não chama createRefund de novo', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'order-1', status: 'REFUNDED', mpPaymentId: 'pay-99' })

    const res = await POST(refundReq(), makeParams())

    expect(res.status).toBe(409)
    expect(createRefundMock).not.toHaveBeenCalled()
  })
})
