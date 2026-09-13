import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const fetchMock = vi.fn()
const prismaMock = vi.hoisted(() => ({
  subscription: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
}))
vi.mock('@/lib/prisma', () => ({ default: prismaMock }))

import { createPreapproval, getPreapproval, cancelPreapproval, reconcileSubscription } from './preapproval'

const MP_TOKEN = 'test-token'

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

beforeEach(() => {
  process.env.MP_ACCESS_TOKEN = MP_TOKEN
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete process.env.MP_ACCESS_TOKEN
})

describe('createPreapproval', () => {
  it('cria preapproval inline com auto_recurring e retorna id/initPoint', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'pre-1', init_point: 'https://mp/init', sandbox_init_point: 'https://mp/sandbox' }),
    )

    const res = await createPreapproval({
      subscriptionId: 'sub-1',
      payerEmail: 'a@b.com',
      backUrl: 'https://app/retorno',
      amountCents: 2990,
    })

    expect(res).toEqual({ mpPreapprovalId: 'pre-1', initPoint: 'https://mp/init' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/preapproval',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        body: expect.stringContaining('"transaction_amount":29.9'),
      }),
    )
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body)
    expect(sent).toMatchObject({
      reason: 'Acervo NKS — assinatura mensal',
      external_reference: 'sub-1',
      payer_email: 'a@b.com',
      back_url: 'https://app/retorno',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: 29.9, currency_id: 'BRL' },
    })
  })

  it('lança em resposta não-ok', async () => {
    fetchMock.mockResolvedValue(jsonResponse('erro', { ok: false, status: 400 }))
    await expect(createPreapproval({ subscriptionId: 's', payerEmail: 'a@b.com', backUrl: 'u', amountCents: 2990 })).rejects.toThrow(/400/)
  })

  it('lança quando não há id/initPoint na resposta', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'pre-1' }))
    await expect(createPreapproval({ subscriptionId: 's', payerEmail: 'a@b.com', backUrl: 'u', amountCents: 2990 })).rejects.toThrow(/inválida/)
  })
})

describe('getPreapproval', () => {
  it('mapeia status, init_point e next_payment_date', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'pre-1', status: 'authorized', init_point: 'https://mp/init', next_payment_date: '2026-10-13T00:00:00.000-03:00' }),
    )
    const pre = await getPreapproval('pre-1')
    expect(pre).toEqual({
      id: 'pre-1',
      status: 'authorized',
      initPoint: 'https://mp/init',
      nextPaymentDate: '2026-10-13T00:00:00.000-03:00',
    })
  })

  it('retorna nextPaymentDate null quando ausente', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'pre-1', status: 'pending' }))
    const pre = await getPreapproval('pre-1')
    expect(pre.nextPaymentDate).toBeNull()
    expect(pre.initPoint).toBeNull()
  })
})

describe('cancelPreapproval', () => {
  it('faz PUT com status cancelled e retorna o status', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'pre-1', status: 'cancelled' }))
    const pre = await cancelPreapproval('pre-1')
    expect(pre.status).toBe('cancelled')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.mercadopago.com/preapproval/pre-1',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }),
    )
  })
})

describe('reconcileSubscription', () => {
  it('consulta o MP e espelha status + currentPeriodEnd via updateMany', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'pre-1', status: 'authorized', next_payment_date: '2026-11-01T00:00:00.000Z' }),
    )
    await reconcileSubscription('pre-1')
    expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith({
      where: { mpPreapprovalId: 'pre-1' },
      data: { status: 'authorized', currentPeriodEnd: new Date('2026-11-01T00:00:00.000Z') },
    })
  })

  it('zera currentPeriodEnd quando next_payment_date é nulo (cancelado)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'pre-1', status: 'cancelled' }))
    await reconcileSubscription('pre-1')
    expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith({
      where: { mpPreapprovalId: 'pre-1' },
      data: { status: 'cancelled', currentPeriodEnd: null },
    })
  })
})
