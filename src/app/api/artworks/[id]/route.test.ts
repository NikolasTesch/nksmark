import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Status } from '@prisma/client'

// vi.mock é içado para o topo do arquivo; as variáveis que ele referencia
// precisam vir de vi.hoisted() para já existirem nesse momento.
const { prismaMock, protectArtworkManagementRoute, moveArtworkFilesToDeletedMock } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    file: { deleteMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
  protectArtworkManagementRoute: vi.fn(),
  moveArtworkFilesToDeletedMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({
  protectArtworkManagementRoute: () => protectArtworkManagementRoute(),
}))
vi.mock('@/lib/r2/delete', () => ({
  moveArtworkFilesToDeleted: (...args: unknown[]) => moveArtworkFilesToDeletedMock(...args),
}))

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
  protectArtworkManagementRoute.mockResolvedValue({ authorized: true, user: { id: 'admin' } })
  moveArtworkFilesToDeletedMock.mockResolvedValue({
    newPreviewUrl: 'https://pub.example.com/deleted/previews/1-capa.jpg',
    updatedFiles: [{ id: 'f-1', newUrl: 'deleted/files/1-arte.cdr' }],
  })
})

describe('DELETE /api/artworks/[id]', () => {
  it('retorna 404 quando a arte não existe', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue(null)
    const res = await DELETE(new Request('http://localhost/api/artworks/art-1', { method: 'DELETE' }), { params })
    const json = await res.json()
    expect(res.status).toBe(404)
    expect(json.error).toBe('Arte não localizada')
  })

  it('faz soft delete (status ARCHIVED), move arquivos para deleted/ e limpa carrinhos', async () => {
    const mockArtwork = {
      id: 'art-1',
      title: 'Arte Teste',
      previewUrl: 'https://pub.example.com/previews/1-capa.jpg',
      files: [{ id: 'f-1', url: 'files/1-arte.cdr' }],
    }
    prismaMock.artwork.findUnique.mockResolvedValue(mockArtwork)
    prismaMock.artwork.update.mockResolvedValue({ id: 'art-1', status: Status.ARCHIVED })
    prismaMock.file.update.mockResolvedValue({})
    prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 1 })
    prismaMock.$transaction.mockResolvedValue([{ id: 'art-1', status: Status.ARCHIVED }])

    const res = await DELETE(new Request('http://localhost/api/artworks/art-1', { method: 'DELETE' }), { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.status).toBe(Status.ARCHIVED)
    expect(moveArtworkFilesToDeletedMock).toHaveBeenCalledWith(mockArtwork)
    expect(prismaMock.artwork.findUnique).toHaveBeenCalledWith({
      where: { id: 'art-1' },
      include: { files: true },
    })
    expect(prismaMock.$transaction).toHaveBeenCalled()
    // Nunca apaga fisicamente a arte nem os arquivos
    expect(prismaMock.artwork.delete).not.toHaveBeenCalled()
  })

  it('bloqueia quando não autorizado', async () => {
    protectArtworkManagementRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 403 }),
    })
    const res = await DELETE(new Request('http://localhost/api/artworks/art-1', { method: 'DELETE' }), { params })
    expect(res.status).toBe(403)
    expect(prismaMock.artwork.findUnique).not.toHaveBeenCalled()
  })
})

describe('GET /api/artworks/[id]', () => {
  it('exige autenticação de gestão — não expõe a url do R2 para visitantes', async () => {
    protectArtworkManagementRoute.mockResolvedValue({
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

  it('retorna 200 com a arte e seus relacionamentos para usuário FASE', async () => {
    protectArtworkManagementRoute.mockResolvedValue({ authorized: true, user: { id: 'fase-1', role: 'FASE' } })
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
    prismaMock.artwork.findUnique.mockRejectedValue(new Error('db'))
    const res = await DELETE(new Request('http://localhost/api/artworks/art-1', { method: 'DELETE' }), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Erro interno no servidor')
  })
})

describe('PATCH /api/artworks/[id]', () => {
  it('bloqueia não autorizado', async () => {
    protectArtworkManagementRoute.mockResolvedValue({
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

  it('adiciona novos arquivos originais (addFiles) no PATCH', async () => {
    prismaMock.artwork.update.mockResolvedValue({})
    prismaMock.artwork.findUnique.mockResolvedValue({ id: 'art-1' })
    const res = await PATCH(
      patchReq({
        addFiles: [
          { url: 'files/123-vetor.cdr', format: 'CDR', size: 2048 },
          { url: 'files/123-vetor.ai', format: 'AI', size: 4096 },
        ],
      }),
      { params }
    )
    expect(res.status).toBe(200)
    expect(prismaMock.file.createMany).toHaveBeenCalledWith({
      data: [
        { format: 'CDR', url: 'files/123-vetor.cdr', size: 2048, artworkId: 'art-1' },
        { format: 'AI', url: 'files/123-vetor.ai', size: 4096, artworkId: 'art-1' },
      ],
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
