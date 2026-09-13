import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Status } from '@prisma/client'

// vi.mock é içado para o topo do arquivo; as variáveis que ele referencia
// precisam vir de vi.hoisted() para já existirem nesse momento.
const { prismaMock, protectAdminRoute } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    file: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
  protectAdminRoute: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({ protectAdminRoute: () => protectAdminRoute() }))

import { DELETE, GET, PATCH } from './route'

function patchReq(body: unknown) {
  return new Request('http://localhost/api/artworks/art-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

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

  it('retorna 404 quando a arte não existe', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/artworks/art-1'), { params })
    const json = await res.json()
    expect(res.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Arte não localizada')
  })

  it('retorna 200 com a arte e seus relacionamentos', async () => {
    const sample = { id: 'art-1', title: 'T', category: { id: 'c1' }, tags: [], files: [] }
    prismaMock.artwork.findUnique.mockResolvedValue(sample)
    const res = await GET(new Request('http://localhost/api/artworks/art-1'), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual(sample)
    expect(prismaMock.artwork.findUnique).toHaveBeenCalledWith({
      where: { id: 'art-1' },
      include: { category: true, tags: true, files: true },
    })
  })

  it('retorna 500 em falha interna do banco', async () => {
    prismaMock.artwork.findUnique.mockRejectedValue(new Error('db'))
    const res = await GET(new Request('http://localhost/api/artworks/art-1'), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Erro no servidor')
  })
})

describe('DELETE /api/artworks/[id] — erro', () => {
  it('retorna 500 quando o arquivamento falha', async () => {
    prismaMock.artwork.update.mockRejectedValue(new Error('db'))
    const res = await DELETE(new Request('http://localhost/api/artworks/art-1', { method: 'DELETE' }), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Erro interno no servidor')
  })
})

describe('PATCH /api/artworks/[id]', () => {
  it('bloqueia não-admin', async () => {
    protectAdminRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 403 }),
    })
    const res = await PATCH(patchReq({ title: 'Novo' }), { params })
    expect(res.status).toBe(403)
    expect(prismaMock.artwork.update).not.toHaveBeenCalled()
  })

  it('rejeita payload inválido com 400', async () => {
    const res = await PATCH(patchReq({ title: 'ab' }), { params })
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('atualiza arte com sucesso (200)', async () => {
    prismaMock.artwork.update.mockResolvedValue({})
    prismaMock.artwork.findUnique.mockResolvedValue({ id: 'art-1', title: 'Novo Titulo' })
    const res = await PATCH(patchReq({ title: 'Novo Titulo', status: 'PUBLISHED', priceCents: 2000 }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const call = prismaMock.artwork.update.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'art-1' })
    expect(call.data.title).toBe('Novo Titulo')
    expect(call.data.slug).toBe('novo-titulo')
    expect(call.data.status).toBe('PUBLISHED')
    expect(call.data.priceCents).toBe(2000)
    expect(json.data.title).toBe('Novo Titulo')
  })

  it('remove arquivos e adiciona imagens de galeria', async () => {
    prismaMock.artwork.update.mockResolvedValue({})
    prismaMock.artwork.findUnique.mockResolvedValue({ id: 'art-1' })
    const res = await PATCH(
      patchReq({
        removeFileIds: ['f1', 'f2'],
        addGalleryImages: [{ url: 'https://x/p.png', format: 'PNG', size: 10 }],
      }),
      { params }
    )
    expect(res.status).toBe(200)
    expect(prismaMock.file.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['f1', 'f2'] }, artworkId: 'art-1' },
    })
    expect(prismaMock.file.createMany).toHaveBeenCalledWith({
      data: [{ format: 'PNG', url: 'https://x/p.png', size: 10, artworkId: 'art-1' }],
    })
  })

  it('retorna 500 quando o update falha', async () => {
    prismaMock.artwork.update.mockRejectedValue(new Error('db'))
    const res = await PATCH(patchReq({ title: 'Novo Titulo' }), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Erro interno no servidor')
  })
})
