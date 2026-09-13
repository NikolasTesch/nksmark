import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, authMock, createPreapprovalMock, getPreapprovalMock } = vi.hoisted(() => ({
  prismaMock: {
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  authMock: vi.fn(),
  createPreapprovalMock: vi.fn(),
  getPreapprovalMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/auth', () => ({ auth: (...a: unknown[]) => authMock(...a) }))
vi.mock('@/lib/payments/preapproval', () => ({
  createPreapproval: (...a: unknown[]) => createPreapprovalMock(...a),
  getPreapproval: (...a: unknown[]) => getPreapprovalMock(...a),
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.MP_ACERVO_AMOUNT_CENTS = '2990'
})

describe('POST /api/subscriptions/checkout', () => {
  it('exige login (401 sem sessão)', async () => {
    authMock.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/subscriptions/checkout', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('cria assinatura local pending + preapproval e devolve initPoint', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.com' } })
    prismaMock.subscription.findUnique.mockResolvedValue(null)
    prismaMock.subscription.create.mockResolvedValue({ id: 'sub-1' })
    createPreapprovalMock.mockResolvedValue({ mpPreapprovalId: 'pre-1', initPoint: 'https://mp/init' })
    prismaMock.subscription.update.mockResolvedValue({})

    const res = await POST(new Request('http://localhost/api/subscriptions/checkout', { method: 'POST' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.initPoint).toBe('https://mp/init')
    expect(createPreapprovalMock).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: 'sub-1', payerEmail: 'a@b.com', amountCents: 2990 }),
    )
    expect(prismaMock.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1' }, data: { mpPreapprovalId: 'pre-1', status: 'pending' } }),
    )
  })

  it('reaproveita preapproval ativo existente (não cria novo)', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1', email: 'a@b.com' } })
    prismaMock.subscription.findUnique.mockResolvedValue({ id: 'sub-1', mpPreapprovalId: 'pre-1', status: 'authorized' })
    getPreapprovalMock.mockResolvedValue({ initPoint: 'https://mp/reuse' })

    const res = await POST(new Request('http://localhost/api/subscriptions/checkout', { method: 'POST' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.initPoint).toBe('https://mp/reuse')
    expect(createPreapprovalMock).not.toHaveBeenCalled()
  })
})
