import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Status } from '@prisma/client'

// vi.mock é içado para o topo do arquivo; as variáveis que ele referencia
// precisam vir de vi.hoisted() para já existirem nesse momento.
const { prismaMock, protectAdminRoute } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    file: { deleteMany: vi.fn() },
  },
  protectAdminRoute: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({ protectAdminRoute: () => protectAdminRoute() }))

import { DELETE, GET } from './route'

const params = Promise.resolve({ id: 'art-1' })

beforeEach(() => {
  vi.clearAllMocks()
  protectAdminRoute.mockResolvedValue({ authorized: true, user: { id: 'admin' } })
})

describe('DELETE /api/artworks/[id]', () => {
  it('faz soft delete (status ARCHIVED) e NÃO deleta fisicamente', async () => {
    prismaMock.artwork.update.mockResolvedValue({ id: 'art-1', status: Status.ARCHIVED })

    const res = await DELETE(new Request('http://localhost/api/artworks/art-1', { method: 'DELETE' }), { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.status).toBe(Status.ARCHIVED)
    expect(prismaMock.artwork.update).toHaveBeenCalledWith({
      where: { id: 'art-1' },
      data: { status: Status.ARCHIVED },
    })
    // Regra inviolável: nunca apagar fisicamente arte nem seus arquivos.
    expect(prismaMock.artwork.delete).not.toHaveBeenCalled()
    expect(prismaMock.file.deleteMany).not.toHaveBeenCalled()
  })

  it('bloqueia quando não é admin', async () => {
    protectAdminRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 403 }),
    })
    const res = await DELETE(new Request('http://localhost/api/artworks/art-1', { method: 'DELETE' }), { params })
    expect(res.status).toBe(403)
    expect(prismaMock.artwork.update).not.toHaveBeenCalled()
  })
})

describe('GET /api/artworks/[id]', () => {
  it('exige admin — não expõe a url do R2 para visitantes', async () => {
    protectAdminRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 401 }),
    })
    const res = await GET(new Request('http://localhost/api/artworks/art-1'), { params })
    expect(res.status).toBe(401)
    // Nunca deve consultar o banco (logo, nunca retorna files.url) sem autorização.
    expect(prismaMock.artwork.findUnique).not.toHaveBeenCalled()
  })
})
