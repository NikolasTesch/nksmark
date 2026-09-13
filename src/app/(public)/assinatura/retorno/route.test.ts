import { describe, it, expect, beforeEach, vi } from 'vitest'

const { reconcileSubscriptionMock } = vi.hoisted(() => ({
  reconcileSubscriptionMock: vi.fn(),
}))

vi.mock('@/lib/payments/preapproval', () => ({
  reconcileSubscription: (...a: unknown[]) => reconcileSubscriptionMock(...a),
}))

import { GET } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
})

describe('GET /assinatura/retorno', () => {
  it('redireciona para /assinatura mesmo sem preapproval_id', async () => {
    const res = await GET(new Request('http://localhost/assinatura/retorno'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/assinatura')
    expect(reconcileSubscriptionMock).not.toHaveBeenCalled()
  })

  it('NÃO confia na query: sempre reconcilia via GET /preapproval/{id}', async () => {
    // Query traz status=approved, mas ignoramos e consultamos o MP.
    reconcileSubscriptionMock.mockResolvedValue(undefined)
    const res = await GET(new Request('http://localhost/assinatura/retorno?preapproval_id=pre-1&status=approved&collection_status=approved'))

    expect(res.status).toBe(307)
    expect(reconcileSubscriptionMock).toHaveBeenCalledWith('pre-1')
  })

  it('redireciona mesmo se a consolidação falhar (não trava o retorno)', async () => {
    reconcileSubscriptionMock.mockRejectedValue(new Error('MP fora do ar'))
    const res = await GET(new Request('http://localhost/assinatura/retorno?preapproval_id=pre-1'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/assinatura')
  })
})
