import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Status } from '@prisma/client'

const prismaMock = {
  file: { findUnique: vi.fn(), findMany: vi.fn() },
  download: { create: vi.fn(), findMany: vi.fn() },
}
const protectFaseRoute = vi.fn()
const getSignedDownloadUrl = vi.fn()

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({ protectFaseRoute: () => protectFaseRoute() }))
vi.mock('@/lib/r2/signed-url', () => ({ getSignedDownloadUrl: (...a: unknown[]) => getSignedDownloadUrl(...a) }))

import { POST, GET } from './route'

function postReq(body: unknown) {
  return new Request('http://localhost/api/downloads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  protectFaseRoute.mockResolvedValue({ authorized: true, user: { id: 'user-1' } })
  getSignedDownloadUrl.mockResolvedValue('https://r2.example/signed?token=abc')
})

describe('POST /api/downloads', () => {
  it('bloqueia download de arte não publicada (regra de negócio)', async () => {
    prismaMock.file.findUnique.mockResolvedValue({
      id: 'file-1', artworkId: 'art-1', format: 'CDR', url: 'files/x.cdr',
      artwork: { id: 'art-1', title: 'X', status: Status.DRAFT },
    })

    const res = await POST(postReq({ artworkId: 'art-1', fileId: 'file-1' }))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.success).toBe(false)
    expect(prismaMock.download.create).not.toHaveBeenCalled()
  })

  it('registra o download e devolve URL assinada para arte publicada', async () => {
    prismaMock.file.findUnique.mockResolvedValue({
      id: 'file-1', artworkId: 'art-1', format: 'CDR', url: 'files/x.cdr',
      artwork: { id: 'art-1', title: 'Minha Arte', status: Status.PUBLISHED },
    })
    prismaMock.download.create.mockResolvedValue({ id: 'dl-1' })

    const res = await POST(postReq({ artworkId: 'art-1', fileId: 'file-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.downloadUrl).toContain('https://r2.example/signed')
    expect(prismaMock.download.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', artworkId: 'art-1', fileId: 'file-1' },
    })
  })

  it('retorna 404 quando o arquivo não pertence à arte informada', async () => {
    prismaMock.file.findUnique.mockResolvedValue({
      id: 'file-1', artworkId: 'outra-arte', format: 'CDR', url: 'files/x.cdr',
      artwork: { id: 'outra-arte', title: 'X', status: Status.PUBLISHED },
    })
    const res = await POST(postReq({ artworkId: 'art-1', fileId: 'file-1' }))
    expect(res.status).toBe(404)
  })

  it('bloqueia quando não autorizado', async () => {
    protectFaseRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 403 }),
    })
    const res = await POST(postReq({ artworkId: 'art-1', fileId: 'file-1' }))
    expect(res.status).toBe(403)
    expect(prismaMock.file.findUnique).not.toHaveBeenCalled()
  })
})

describe('GET /api/downloads', () => {
  it('deriva o formato do File real, não do fileId', async () => {
    prismaMock.download.findMany.mockResolvedValue([
      { id: 'dl-1', artworkId: 'art-1', fileId: 'clabc123', createdAt: new Date(),
        artwork: { id: 'art-1', title: 'Arte', previewUrl: 'p.png' } },
    ])
    prismaMock.file.findMany.mockResolvedValue([{ id: 'clabc123', format: 'AI' }])

    const res = await GET(new Request('http://localhost/api/downloads'))
    const json = await res.json()

    expect(json.data[0].format).toBe('AI')
    // não deve ser o cuid em maiúsculas (bug antigo)
    expect(json.data[0].format).not.toBe('CLABC123')
  })

  it('usa "N/D" quando o arquivo não é mais encontrado', async () => {
    prismaMock.download.findMany.mockResolvedValue([
      { id: 'dl-1', artworkId: 'art-1', fileId: 'sumiu', createdAt: new Date(),
        artwork: { id: 'art-1', title: 'Arte', previewUrl: 'p.png' } },
    ])
    prismaMock.file.findMany.mockResolvedValue([])

    const res = await GET(new Request('http://localhost/api/downloads'))
    const json = await res.json()
    expect(json.data[0].format).toBe('N/D')
  })
})
