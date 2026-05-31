import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Format } from '@prisma/client'

const { prismaMock, protectAdminRoute } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { findMany: vi.fn() },
  },
  protectAdminRoute: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({ protectAdminRoute: () => protectAdminRoute() }))

import { GET } from './route'

// Uma arte com um mockup (PNG, público) e um vetor original (CDR, privado).
function artworkWithFiles() {
  return [
    {
      id: 'art-1',
      title: 'Mandala',
      previewUrl: 'https://cdn/preview.png',
      category: { id: 'c1', name: 'Cat' },
      tags: [],
      files: [
        { id: 'f-png', format: Format.PNG, url: 'https://cdn/mockup.png', size: 100, artworkId: 'art-1' },
        { id: 'f-cdr', format: Format.CDR, url: 'https://r2/secret.cdr', size: 200, artworkId: 'art-1' },
      ],
    },
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.artwork.findMany.mockResolvedValue(artworkWithFiles())
})

describe('GET /api/artworks (público)', () => {
  it('expõe a url de mockups PNG/JPG mas remove a do vetor original', async () => {
    const res = await GET(new Request('http://localhost/api/artworks?slug=mandala'))
    const json = await res.json()

    expect(res.status).toBe(200)
    const files = json.data[0].files
    const png = files.find((f: { id: string }) => f.id === 'f-png')
    const cdr = files.find((f: { id: string }) => f.id === 'f-cdr')

    // Mockup público mantém a url para a galeria.
    expect(png.url).toBe('https://cdn/mockup.png')
    // Vetor original NUNCA expõe a url/chave R2 para visitantes.
    expect(cdr.url).toBeUndefined()
    // protectAdminRoute não é chamado em request público.
    expect(protectAdminRoute).not.toHaveBeenCalled()
  })
})

describe('GET /api/artworks?admin=true', () => {
  it('mantém a url de todos os arquivos para o admin autenticado', async () => {
    protectAdminRoute.mockResolvedValue({ authorized: true, user: { id: 'admin' } })

    const res = await GET(new Request('http://localhost/api/artworks?admin=true'))
    const json = await res.json()

    expect(res.status).toBe(200)
    const files = json.data[0].files
    expect(files.find((f: { id: string }) => f.id === 'f-png').url).toBe('https://cdn/mockup.png')
    expect(files.find((f: { id: string }) => f.id === 'f-cdr').url).toBe('https://r2/secret.cdr')
  })

  it('bloqueia admin não autenticado', async () => {
    protectAdminRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 401 }),
    })

    const res = await GET(new Request('http://localhost/api/artworks?admin=true'))
    expect(res.status).toBe(401)
    expect(prismaMock.artwork.findMany).not.toHaveBeenCalled()
  })
})
