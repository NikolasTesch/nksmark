import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, getPaymentMock, verifySignatureMock, resendSendMock } = vi.hoisted(() => ({
  prismaMock: {
    order: { findUnique: vi.fn(), update: vi.fn() },
  },
  getPaymentMock: vi.fn(),
  verifySignatureMock: vi.fn(),
  resendSendMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/payments/mercadopago', () => ({
  getPayment: (...a: unknown[]) => getPaymentMock(...a),
  verifyWebhookSignature: (...a: unknown[]) => verifySignatureMock(...a),
}))
vi.mock('@/lib/email/resend', () => ({
  resend: { emails: { send: (...a: unknown[]) => resendSendMock(...a) } },
  EMAIL_FROM: 'NKS <no@nks.com>',
}))

import { POST } from './route'

function webhookReq(query: string, body: unknown = {}) {
  return new Request(`http://localhost/api/payments/webhook?${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-signature': 'ts=1,v1=abc', 'x-request-id': 'req-1' },
    body: JSON.stringify(body),
  })
}

const pendingOrder = {
  id: 'order-1',
  status: 'PENDING',
  mpPaymentId: null,
  amountCents: 1500,
  artwork: { title: 'Minha Arte' },
  user: { email: 'cliente@x.com', name: 'Cliente' },
}

beforeEach(() => {
  vi.clearAllMocks()
  verifySignatureMock.mockReturnValue(true)
  resendSendMock.mockResolvedValue({ error: null })
  prismaMock.order.update.mockResolvedValue({})
  process.env.RESEND_API_KEY = 'real-key'
  process.env.MP_WEBHOOK_SECRET = 'secret'
})

describe('POST /api/payments/webhook', () => {
  it('rejeita assinatura inválida com 401', async () => {
    verifySignatureMock.mockReturnValue(false)
    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(401)
    expect(getPaymentMock).not.toHaveBeenCalled()
  })

  it('ignora eventos que não são de pagamento', async () => {
    const res = await POST(webhookReq('type=plan&data.id=99'))
    expect(res.status).toBe(200)
    expect(getPaymentMock).not.toHaveBeenCalled()
  })

  it('aprova o pedido e dispara e-mail quando pagamento approved e valor confere', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: 'order-1', transactionAmount: 15, paymentTypeId: 'pix' })
    prismaMock.order.findUnique.mockResolvedValue({ ...pendingOrder })

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'order-1' }, data: expect.objectContaining({ status: 'PAID', mpPaymentId: '99' }) })
    )
    expect(resendSendMock).toHaveBeenCalledTimes(1)
  })

  it('é idempotente: pedido já pago não é reprocessado', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: 'order-1', transactionAmount: 15, paymentTypeId: 'pix' })
    prismaMock.order.findUnique.mockResolvedValue({ ...pendingOrder, status: 'PAID' })

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).not.toHaveBeenCalled()
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it('não aprova quando o valor pago diverge do pedido', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: 'order-1', transactionAmount: 99, paymentTypeId: 'pix' })
    prismaMock.order.findUnique.mockResolvedValue({ ...pendingOrder })

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('marca FAILED quando pagamento é rejeitado', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'rejected', externalReference: 'order-1', transactionAmount: 15, paymentTypeId: 'credit_card' })
    prismaMock.order.findUnique.mockResolvedValue({ ...pendingOrder })

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
    )
  })

  it('ignora pedido inexistente (external_reference desconhecido)', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: 'sumiu', transactionAmount: 15, paymentTypeId: 'pix' })
    prismaMock.order.findUnique.mockResolvedValue(null)

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })
})
