import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Role } from '@prisma/client'

const { prismaMock, protectAdminRouteMock, hashPasswordMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  protectAdminRouteMock: vi.fn(),
  hashPasswordMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({
  protectAdminRoute: () => protectAdminRouteMock(),
}))
vi.mock('@/lib/auth/password', () => ({
  hashPassword: (pwd: string) => hashPasswordMock(pwd),
}))

import { GET, POST } from './route'
import { PATCH, DELETE } from './[id]/route'

beforeEach(() => {
  vi.clearAllMocks()
  protectAdminRouteMock.mockResolvedValue({
    authorized: true,
    response: null,
    user: { id: 'admin-1', role: 'ADMIN' },
  })
  hashPasswordMock.mockResolvedValue('hashed_pwd_123')
})

describe('GET /api/admin/users', () => {
  it('retorna 403 para não-admin', async () => {
    protectAdminRouteMock.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 }),
    })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('retorna apenas membros da equipe (FASE e ADMIN)', async () => {
    const mockUsers = [
      { id: 'u1', name: 'Designer 1', email: 'd1@equipe.com', role: Role.FASE, createdAt: new Date() },
      { id: 'u2', name: 'Admin 1', email: 'adm@equipe.com', role: Role.ADMIN, createdAt: new Date() },
    ]
    prismaMock.user.findMany.mockResolvedValue(mockUsers)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(2)
    expect(json.data[0].id).toBe('u1')
    expect(json.data[1].id).toBe('u2')
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: { in: [Role.FASE, Role.ADMIN] } },
      })
    )
  })

  it('retorna 500 se o banco falhar', async () => {
    prismaMock.user.findMany.mockRejectedValue(new Error('DB Error'))
    const res = await GET()
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.success).toBe(false)
  })
})

describe('POST /api/admin/users', () => {
  it('retorna 403 para não-admin', async () => {
    protectAdminRouteMock.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 }),
    })
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'novo@equipe.com', password: 'password123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('retorna 400 se os dados forem inválidos (senha curta ou email inválido)', async () => {
    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalido', password: '123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
  })

  it('retorna 400 se o email já pertencer a um membro ativo da equipe', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-1',
      email: 'membro@equipe.com',
      role: Role.FASE,
    })

    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Membro Existente',
        email: 'membro@equipe.com',
        role: 'FASE',
        password: 'password123',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Este e-mail já está cadastrado na equipe.')
  })

  it('reativa e atualiza credenciais de um usuário VISITOR rebaixado anteriormente', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'visitor-1',
      email: 'antigo@equipe.com',
      role: Role.VISITOR,
    })
    const reactivatedUser = {
      id: 'visitor-1',
      name: 'Antigo Membro',
      email: 'antigo@equipe.com',
      role: Role.FASE,
      createdAt: new Date(),
    }
    prismaMock.user.update.mockResolvedValue(reactivatedUser)

    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Antigo Membro',
        email: 'antigo@equipe.com',
        role: 'FASE',
        password: 'nova-senha-forte-123',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.role).toBe(Role.FASE)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'visitor-1' },
        data: expect.objectContaining({
          role: Role.FASE,
          passwordHash: 'hashed_pwd_123',
        }),
      })
    )
  })

  it('cria com sucesso um novo membro da equipe (status 201)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const createdUser = {
      id: 'new-user-1',
      name: 'Novo Designer',
      email: 'novo@equipe.com',
      role: Role.FASE,
      createdAt: new Date(),
    }
    prismaMock.user.create.mockResolvedValue(createdUser)

    const req = new Request('http://localhost/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Novo Designer',
        email: 'novo@equipe.com',
        role: 'FASE',
        password: 'senha-super-segura-123',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe('new-user-1')
    expect(json.data.email).toBe('novo@equipe.com')
    expect(json.data.role).toBe(Role.FASE)
    expect(hashPasswordMock).toHaveBeenCalledWith('senha-super-segura-123')
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Novo Designer',
          email: 'novo@equipe.com',
          role: Role.FASE,
          passwordHash: 'hashed_pwd_123',
        },
      })
    )
  })
})

describe('PATCH /api/admin/users/[id]', () => {
  it('retorna 400 se a nova senha for menor que 8 caracteres', async () => {
    const req = new Request('http://localhost/api/admin/users/user-1', {
      method: 'PATCH',
      body: JSON.stringify({ password: '123' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'user-1' }) })
    expect(res.status).toBe(400)
  })

  it('atualiza role e nome com sucesso', async () => {
    const updatedUser = {
      id: 'user-1',
      name: 'Nome Atualizado',
      email: 'u1@equipe.com',
      role: Role.ADMIN,
      createdAt: new Date(),
    }
    prismaMock.user.update.mockResolvedValue(updatedUser)

    const req = new Request('http://localhost/api/admin/users/user-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Nome Atualizado', role: 'ADMIN' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'user-1' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { name: 'Nome Atualizado', role: Role.ADMIN },
      })
    )
  })
})

describe('DELETE /api/admin/users/[id]', () => {
  it('impede exclusão da conta master admin', async () => {
    const req = new Request('http://localhost/api/admin/users/admin', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'admin' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Não é possível excluir a conta master')
  })

  it('revoga acesso do usuário alterando sua role para VISITOR (soft delete seguro)', async () => {
    const revokedUser = {
      id: 'user-123',
      name: 'Membro Revogado',
      email: 'revogado@equipe.com',
      role: Role.VISITOR,
      createdAt: new Date(),
    }
    prismaMock.user.update.mockResolvedValue(revokedUser)

    const req = new Request('http://localhost/api/admin/users/user-123', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'user-123' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-123' },
        data: { role: Role.VISITOR },
      })
    )
  })
})
