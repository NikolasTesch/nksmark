import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import { verifyWebhookSignature, createPreference, getPayment, createRefund, MercadoPagoRefundError } from './mercadopago'

const SECRET = 'webhook-secret-123'

function signedHeader(dataId: string, requestId: string, ts: string, secret = SECRET): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex')
  return `ts=${ts},v1=${v1}`
}

const fetchMock = vi.fn()

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

const prefInput = {
  orderId: 'ord-1',
  items: [{ id: 'i1', title: 'Art', unitPrice: 15, quantity: 1 }],
  payerEmail: 'a@b.com',
  successUrl: 'http://x/s',
  pendingUrl: 'http://x/p',
  failureUrl: 'http://x/f',
  notificationUrl: 'http://x/n',
}

beforeEach(() => {
  process.env.MP_ACCESS_TOKEN = 'test-token'
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete process.env.MP_ACCESS_TOKEN
})

describe('verifyWebhookSignature', () => {
  it('aceita uma assinatura válida', () => {
    const header = signedHeader('123456', 'req-abc', '1700000000')
    expect(verifyWebhookSignature(header, 'req-abc', '123456', SECRET)).toBe(true)
  })

  it('normaliza o data.id para minúsculas (igual ao Mercado Pago)', () => {
    const header = signedHeader('ABCDEF', 'req-1', '1700000000')
    expect(verifyWebhookSignature(header, 'req-1', 'ABCDEF', SECRET)).toBe(true)
  })

  it('rejeita assinatura com hash adulterado', () => {
    const header = signedHeader('123456', 'req-abc', '1700000000')
    const tampered = header.replace(/v1=.*/, 'v1=deadbeef')
    expect(verifyWebhookSignature(tampered, 'req-abc', '123456', SECRET)).toBe(false)
  })

  it('rejeita quando o segredo é diferente', () => {
    const header = signedHeader('123456', 'req-abc', '1700000000', 'outro-segredo')
    expect(verifyWebhookSignature(header, 'req-abc', '123456', SECRET)).toBe(false)
  })

  it('rejeita header/secret/dataId ausentes', () => {
    expect(verifyWebhookSignature(null, 'req', '1', SECRET)).toBe(false)
    expect(verifyWebhookSignature('ts=1,v1=abc', 'req', '1', undefined)).toBe(false)
    expect(verifyWebhookSignature('ts=1,v1=abc', 'req', null, SECRET)).toBe(false)
  })

  it('rejeita header malformado (sem ts/v1)', () => {
    expect(verifyWebhookSignature('garbage', 'req', '123', SECRET)).toBe(false)
  })
})

describe('createPreference', () => {
  it('cria preference e retorna id/initPoint com token no header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'pref-1', init_point: 'https://mp/init' }))

    const res = await createPreference(prefInput)

    expect(res.preferenceId).toBe('pref-1')
    expect(res.initPoint).toBe('https://mp/init')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/checkout/preferences',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    )
  })

  it('lança ao remover aspas/espaços do token (branch de trim)', async () => {
    process.env.MP_ACCESS_TOKEN = '  "tok-trim"  '
    fetchMock.mockResolvedValue(jsonResponse({ id: 'pref-1', init_point: 'https://mp/init' }))

    await createPreference(prefInput)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok-trim' }),
      }),
    )
  })

  it('lança quando MP_ACCESS_TOKEN não está configurado', async () => {
    delete process.env.MP_ACCESS_TOKEN
    fetchMock.mockResolvedValue(jsonResponse({ id: 'p', init_point: 'x' }))

    await expect(createPreference(prefInput)).rejects.toThrow(/MP_ACCESS_TOKEN/)
  })

  it('lança em resposta não-ok do Mercado Pago', async () => {
    fetchMock.mockResolvedValue(jsonResponse('algo errado', { ok: false, status: 400 }))

    await expect(createPreference(prefInput)).rejects.toThrow(/400/)
  })

  it('lança quando a resposta não tem id/init_point', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'pref-1' }))

    await expect(createPreference(prefInput)).rejects.toThrow(/Resposta inválida/)
  })

  it('propaga erro de rede (fetch rejeita)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(createPreference(prefInput)).rejects.toThrow(/network down/)
  })
})

describe('getPayment', () => {
  it('mapeia a resposta do MP para MercadoPagoPayment', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 99,
        status: 'approved',
        external_reference: 'ord-1',
        transaction_amount: 15,
        payment_method_id: 'pix',
        payment_type_id: 'pix',
      }),
    )

    const p = await getPayment('99')

    expect(p).toEqual({
      id: 99,
      status: 'approved',
      externalReference: 'ord-1',
      transactionAmount: 15,
      paymentMethodId: 'pix',
      paymentTypeId: 'pix',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/payments/99',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    )
  })

  it('lança em resposta não-ok do Mercado Pago', async () => {
    fetchMock.mockResolvedValue(jsonResponse('denied', { ok: false, status: 401 }))

    await expect(getPayment('99')).rejects.toThrow(/401/)
  })

  it('propaga erro de rede (fetch rejeita)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(getPayment('99')).rejects.toThrow(/network down/)
  })
})

describe('createRefund', () => {
  it('estorna com sucesso (approved) e envia headers de idempotência/in-process', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'ref-1', status: 'approved' }, { status: 201 }))

    const res = await createRefund('pay-99', { idempotencyKey: 'key-xyz' })

    expect(res).toEqual({ refundId: 'ref-1', status: 'approved' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/payments/pay-99/refunds',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
          'X-Idempotency-Key': 'key-xyz',
          'X-Render-In-Process-Refunds': 'true',
        }),
        body: JSON.stringify({}),
      }),
    )
  })

  it('gera X-Idempotency-Key quando não informado', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'ref-2', status: 'approved' }, { status: 201 }))

    await createRefund('pay-99')

    // O arquivo não limpa fetchMock.mock.calls entre testes: busca a chamada de
    // refund específica em vez de indexar calls[0].
    const refundsCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/refunds'))
    const refundsCall = refundsCalls[refundsCalls.length - 1]
    const headers = (refundsCall as unknown[])[1] as { headers: Record<string, string> }
    expect(headers.headers['X-Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('aceita in_process (Pix) e mantém o pedido em aberto', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'ref-3', status: 'in_process' }, { status: 201 }))

    const res = await createRefund('pay-99')

    expect(res).toEqual({ refundId: 'ref-3', status: 'in_process' })
  })

  it('lança MercadoPagoRefundError com cause 4296 quando já estornado', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(JSON.stringify({ message: 'já estornado', cause: [{ code: 4296 }] }), {
        ok: false,
        status: 404,
      }),
    )

    const err = await createRefund('pay-99').catch((e) => e)
    expect(err).toBeInstanceOf(MercadoPagoRefundError)
    expect((err as MercadoPagoRefundError).status).toBe(404)
    expect((err as MercadoPagoRefundError).causeCodes).toEqual([4296])
  })

  it('lança MercadoPagoRefundError com cause 2063 em estado inválido', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(JSON.stringify({ message: 'estado inválido', cause: [{ code: 2063 }] }), {
        ok: false,
        status: 400,
      }),
    )

    const err = await createRefund('pay-99').catch((e) => e)
    expect(err).toBeInstanceOf(MercadoPagoRefundError)
    expect((err as MercadoPagoRefundError).causeCodes).toEqual([2063])
  })
})
