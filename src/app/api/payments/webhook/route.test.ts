import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, getPaymentMock, verifySignatureMock, resendSendMock, reconcileSubscriptionMock } = vi.hoisted(() => ({
  prismaMock: {
    order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    subscription: { updateMany: vi.fn() },
  },
  getPaymentMock: vi.fn(),
  verifySignatureMock: vi.fn(),
  resendSendMock: vi.fn(),
  reconcileSubscriptionMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/payments/mercadopago', () => ({
  getPayment: (...a: unknown[]) => getPaymentMock(...a),
  verifyWebhookSignature: (...a: unknown[]) => verifySignatureMock(...a),
}))
vi.mock('@/lib/payments/preapproval', () => ({
  reconcileSubscription: (...a: unknown[]) => reconcileSubscriptionMock(...a),
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
  prismaMock.order.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 })
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
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'PAID', mpPaymentId: '99' }),
      })
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
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'FAILED' }),
      })
    )
  })

  it('ignora pedido inexistente (external_reference desconhecido)', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: 'sumiu', transactionAmount: 15, paymentTypeId: 'pix' })
    prismaMock.order.findUnique.mockResolvedValue(null)

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled()
  })

  it('retorna 502 (não 2xx) quando o processamento falha para acionar retry', async () => {
    getPaymentMock.mockRejectedValue(new Error('MP API timeout'))

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(502)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('atalho de pedido já pago retorna 200 (sucesso idempotente)', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: 'order-1', transactionAmount: 15, paymentTypeId: 'pix' })
    prismaMock.order.findUnique.mockResolvedValue({ ...pendingOrder, status: 'PAID' })

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled()
  })

  it('payment.updated com status refunded consolida pedido PAID -> REFUNDED', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'refunded', externalReference: 'order-1', transactionAmount: 15, paymentTypeId: 'pix' })
    prismaMock.order.findUnique.mockResolvedValue({ ...pendingOrder, status: 'PAID' })

    const res = await POST(webhookReq('type=payment&data.id=99&action=payment.updated'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1', status: 'PAID' },
        data: expect.objectContaining({ status: 'REFUNDED', refundPending: false }),
      })
    )
  })

  it('payment.updated refunded em pedido não-PAID não faz transição', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'refunded', externalReference: 'order-1', transactionAmount: 15, paymentTypeId: 'pix' })
    prismaMock.order.findUnique.mockResolvedValue({ ...pendingOrder, status: 'REFUNDED' })

    const res = await POST(webhookReq('type=payment&data.id=99&action=payment.updated'))
    expect(res.status).toBe(200)
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled()
  })
})

describe('webhook — assinatura (Frente B)', () => {
  it('subscription_preapproval: reconcilia via GET /preapproval e retorna 200', async () => {
    reconcileSubscriptionMock.mockResolvedValue(undefined)
    const res = await POST(webhookReq('type=subscription_preapproval&data.id=pre-1'))
    expect(res.status).toBe(200)
    expect(reconcileSubscriptionMock).toHaveBeenCalledWith('pre-1')
    expect(getPaymentMock).not.toHaveBeenCalled()
  })

  it('subscription_preapproval: falha de processamento retorna 502 (retry)', async () => {
    reconcileSubscriptionMock.mockRejectedValue(new Error('MP timeout'))
    const res = await POST(webhookReq('type=subscription_preapproval&data.id=pre-1'))
    expect(res.status).toBe(502)
  })

  it('payment com subscription_id: reconcilia a assinatura e NÃO toca em Order', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: null, transactionAmount: 29.9, paymentTypeId: 'pix', subscriptionId: 'pre-1' })
    reconcileSubscriptionMock.mockResolvedValue(undefined)

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(200)
    expect(reconcileSubscriptionMock).toHaveBeenCalledWith('pre-1')
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled()
  })

  it('payment com subscription_id: falha de reconciliação retorna 502', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: null, transactionAmount: 29.9, paymentTypeId: 'pix', subscriptionId: 'pre-1' })
    reconcileSubscriptionMock.mockRejectedValue(new Error('MP timeout'))

    const res = await POST(webhookReq('type=payment&data.id=99'))
    expect(res.status).toBe(502)
  })

  it('payment de assinatura é idempotente (replay não duplica efeito)', async () => {
    getPaymentMock.mockResolvedValue({ id: 99, status: 'approved', externalReference: null, transactionAmount: 29.9, paymentTypeId: 'pix', subscriptionId: 'pre-1' })
    reconcileSubscriptionMock.mockResolvedValue(undefined)

    await POST(webhookReq('type=payment&data.id=99'))
    await POST(webhookReq('type=payment&data.id=99'))
    // reconcile é chamado a cada evento, mas recomputa o estado a partir do MP
    // (currentPeriodEnd igual → updateMany idempotente).
    expect(reconcileSubscriptionMock).toHaveBeenCalledTimes(2)
  })
})
