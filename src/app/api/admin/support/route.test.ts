import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, protectAdminRouteMock } = vi.hoisted(() => ({
  prismaMock: {
    supportTicket: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  protectAdminRouteMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({
  protectAdminRoute: () => protectAdminRouteMock(),
}))

import { GET } from './route'
import { PATCH } from './[id]/route'

function getReq() {
  return new Request('http://localhost/api/admin/support')
}

function patchReq(body: unknown) {
  return new Request('http://localhost/api/admin/support/ticket-123', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  protectAdminRouteMock.mockResolvedValue({
    authorized: true,
    response: null,
    user: { id: 'admin-1', role: 'ADMIN' },
  })
})

describe('GET /api/admin/support', () => {
  it('retorna 403 para não-admin', async () => {
    protectAdminRouteMock.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 }),
    })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('retorna lista de chamados ordenados por data de criação', async () => {
    const mockTickets = [
      { id: '1', name: 'User 1', email: 'u1@x.com', message: 'Bug 1', status: 'PENDING', createdAt: new Date() },
      { id: '2', name: 'User 2', email: 'u2@x.com', message: 'Bug 2', status: 'RESOLVED', createdAt: new Date() },
    ]
    prismaMock.supportTicket.findMany.mockResolvedValue(mockTickets)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(2)
    expect(json.data[0].name).toBe('User 1')
  })
})

describe('PATCH /api/admin/support/[id]', () => {
  it('retorna 403 para não-admin', async () => {
    protectAdminRouteMock.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 }),
    })
    const res = await PATCH(patchReq({ status: 'RESOLVED' }), { params: Promise.resolve({ id: 'ticket-123' }) })
    expect(res.status).toBe(403)
  })

  it('retorna 400 para status inválido', async () => {
    const res = await PATCH(patchReq({ status: 'INVALID' }), { params: Promise.resolve({ id: 'ticket-123' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe('Status inválido.')
  })

  it('atualiza o status de um chamado para RESOLVED com sucesso', async () => {
    const mockUpdatedTicket = {
      id: 'ticket-123',
      name: 'User 1',
      email: 'u1@x.com',
      message: 'Bug 1',
      status: 'RESOLVED',
      createdAt: new Date(),
    }
    prismaMock.supportTicket.update.mockResolvedValue(mockUpdatedTicket)

    const res = await PATCH(patchReq({ status: 'RESOLVED' }), { params: Promise.resolve({ id: 'ticket-123' }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('RESOLVED')
    expect(prismaMock.supportTicket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-123' },
      data: { status: 'RESOLVED' },
    })
  })
})
