import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Readable } from 'node:stream'
import { Status } from '@prisma/client'

// vi.mock é içado para o topo; as variáveis vêm de vi.hoisted() para já existirem.
const { prismaMock, protectDownloadRoute, canDownloadArtwork, s3Send } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { findUnique: vi.fn() },
    download: { createMany: vi.fn() },
    user: { upsert: vi.fn() },
  },
  protectDownloadRoute: vi.fn(),
  canDownloadArtwork: vi.fn(),
  s3Send: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({ protectDownloadRoute: () => protectDownloadRoute() }))
vi.mock('@/lib/payments/access', () => ({ canDownloadArtwork: (...a: unknown[]) => canDownloadArtwork(...a) }))
vi.mock('@/lib/r2/client', () => ({ s3Client: { send: (...a: unknown[]) => s3Send(...a) }, R2_BUCKET_NAME: 'bucket' }))
vi.mock('@aws-sdk/client-s3', () => ({ GetObjectCommand: class { constructor(public input: unknown) {} } }))

// archiver real travaria esperando bytes; devolvemos um Readable simples
// com os métodos que a rota usa (append/finalize/on).
vi.mock('archiver', () => ({
  default: () => {
    const stream = Readable.from([Buffer.from('zip-bytes')]) as Readable & {
      append: ReturnType<typeof vi.fn>
      finalize: ReturnType<typeof vi.fn>
    }
    stream.append = vi.fn()
    stream.finalize = vi.fn()
    return stream
  },
}))

import { POST } from './route'

function postReq(body: unknown) {
  return new Request('http://localhost/api/downloads/zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function fileObj(id: string, format: string, url: string) {
  return { id, format, url, size: 1, artworkId: 'art-1' }
}

beforeEach(() => {
  vi.clearAllMocks()
  protectDownloadRoute.mockResolvedValue({ authorized: true, user: { id: 'user-1', role: 'FASE' } })
  canDownloadArtwork.mockResolvedValue(true)
  s3Send.mockResolvedValue({ Body: Readable.from([Buffer.from('file-bytes')]) })
  prismaMock.download.createMany.mockResolvedValue({ count: 2 })
})

describe('POST /api/downloads/zip', () => {
  it('gera o .zip e registra um Download por arquivo da arte publicada', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue({
      id: 'art-1', title: 'Minha Arte', status: Status.PUBLISHED,
      files: [fileObj('f1', 'CDR', 'files/a.cdr'), fileObj('f2', 'OTF', 'files/b.otf')],
    })

    const res = await POST(postReq({ artworkId: 'art-1' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/zip')
    expect(res.headers.get('Content-Disposition')).toContain('minha-arte.zip')
    expect(s3Send).toHaveBeenCalledTimes(2)
    expect(prismaMock.download.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', artworkId: 'art-1', fileId: 'f1' },
        { userId: 'user-1', artworkId: 'art-1', fileId: 'f2' },
      ],
    })
  })

  it('bloqueia download de arte não publicada', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue({
      id: 'art-1', title: 'X', status: Status.DRAFT, files: [fileObj('f1', 'CDR', 'files/a.cdr')],
    })

    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(403)
    expect(prismaMock.download.createMany).not.toHaveBeenCalled()
    expect(s3Send).not.toHaveBeenCalled()
  })

  it('retorna 404 quando a arte não existe', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue(null)
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(404)
  })

  it('retorna 404 quando a arte não possui arquivos', async () => {
    prismaMock.artwork.findUnique.mockResolvedValue({
      id: 'art-1', title: 'X', status: Status.PUBLISHED, files: [],
    })
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(404)
    expect(prismaMock.download.createMany).not.toHaveBeenCalled()
  })

  it('bloqueia quando não autorizado', async () => {
    protectDownloadRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 403 }),
    })
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(403)
    expect(prismaMock.artwork.findUnique).not.toHaveBeenCalled()
  })

  it('bloqueia cliente que não comprou a arte', async () => {
    protectDownloadRoute.mockResolvedValue({ authorized: true, user: { id: 'cliente-1', role: 'CLIENT' } })
    canDownloadArtwork.mockResolvedValue(false)
    prismaMock.artwork.findUnique.mockResolvedValue({
      id: 'art-1', title: 'Paga', status: Status.PUBLISHED, isFree: false,
      files: [fileObj('f1', 'CDR', 'files/a.cdr')],
    })
    const res = await POST(postReq({ artworkId: 'art-1' }))
    expect(res.status).toBe(403)
    expect(prismaMock.download.createMany).not.toHaveBeenCalled()
    expect(s3Send).not.toHaveBeenCalled()
  })

  it('valida o body (artworkId obrigatório)', async () => {
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
    expect(prismaMock.artwork.findUnique).not.toHaveBeenCalled()
  })
})
