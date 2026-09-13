import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, authMock, cancelPreapprovalMock } = vi.hoisted(() => ({
  prismaMock: {
    subscription: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
  authMock: vi.fn(),
  cancelPreapprovalMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/auth', () => ({ auth: (...a: unknown[]) => authMock(...a) }))
vi.mock('@/lib/payments/preapproval', () => ({
  cancelPreapproval: (...a: unknown[]) => cancelPreapprovalMock(...a),
}))

import { POST } from './route'

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.subscription.updateMany.mockResolvedValue({ count: 1 })
})

describe('POST /api/subscriptions/me/cancel', () => {
  it('exige login (401 sem sessão)', async () => {
    authMock.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/subscriptions/me/cancel', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('404 quando não há assinatura ativa', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.subscription.findUnique.mockResolvedValue(null)
    const res = await POST(new Request('http://localhost/api/subscriptions/me/cancel', { method: 'POST' }))
    expect(res.status).toBe(404)
    expect(cancelPreapprovalMock).not.toHaveBeenCalled()
  })

  it('cancela no MP e espelha status local via updateMany', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.subscription.findUnique.mockResolvedValue({ id: 'sub-1', mpPreapprovalId: 'pre-1' })
    cancelPreapprovalMock.mockResolvedValue({ id: 'pre-1', status: 'cancelled' })

    const res = await POST(new Request('http://localhost/api/subscriptions/me/cancel', { method: 'POST' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.status).toBe('cancelled')
    expect(cancelPreapprovalMock).toHaveBeenCalledWith('pre-1')
    expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1', mpPreapprovalId: 'pre-1' }, data: { status: 'cancelled' } }),
    )
  })
})
