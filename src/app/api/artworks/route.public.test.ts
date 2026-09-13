import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Format } from '@prisma/client'

const { prismaMock, protectAdminRoute } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { findMany: vi.fn(), count: vi.fn() },
    $queryRaw: vi.fn(),
  },
  protectAdminRoute: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/auth/middleware', () => ({ protectAdminRoute: () => protectAdminRoute() }))

import { GET } from './route'

function makeItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `art-${i}`,
    title: `Arte ${i}`,
    category: { id: 'c1', name: 'Cat', slug: 'cat', color: null },
    tags: [],
    files: [{ id: `f-${i}`, format: Format.PNG, url: 'https://cdn/m.png', size: 1, artworkId: `art-${i}` }],
    _count: { downloads: i },
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.artwork.count.mockResolvedValue(0)
  prismaMock.artwork.findMany.mockResolvedValue([])
  prismaMock.$queryRaw.mockResolvedValue([])
})

describe('GET /api/artworks — catálogo público (novo contrato)', () => {
  it('retorna {items,total,page,pageSize} paginado', async () => {
    prismaMock.artwork.count.mockResolvedValue(100)
    prismaMock.artwork.findMany.mockResolvedValue(makeItems(40))

    const res = await GET(new Request('http://localhost/api/artworks?page=2&pageSize=10'))
    const json = await res.json()

    expect(json).toHaveProperty('items')
    expect(json.total).toBe(100)
    expect(json.items).toHaveLength(40)
    expect(json.page).toBe(2)
    expect(json.pageSize).toBe(10)
  })

  it('clampa pageSize>60 para 60 (CA-6)', async () => {
    prismaMock.artwork.count.mockResolvedValue(60)
    prismaMock.artwork.findMany.mockResolvedValue(makeItems(60))

    const res = await GET(new Request('http://localhost/api/artworks?pageSize=100'))
    const json = await res.json()
    expect(json.pageSize).toBe(60)
  })

  it('normaliza page fora do intervalo (CA-2)', async () => {
    prismaMock.artwork.count.mockResolvedValue(5)
    prismaMock.artwork.findMany.mockResolvedValue(makeItems(5))

    const res = await GET(new Request('http://localhost/api/artworks?page=999'))
    const json = await res.json()
    expect(json.page).toBe(1)
  })

  it('FTS paginado via $queryRaw preserva total (CA-2)', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ id: 'art-0', total: 7 }])
    prismaMock.artwork.findMany.mockResolvedValue(makeItems(1))

    const res = await GET(new Request('http://localhost/api/artworks?q=floral'))
    const json = await res.json()
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1)
    expect(json.total).toBe(7)
    expect(json.items).toHaveLength(1)
  })
})

describe('GET /api/artworks — mantém contratos legados', () => {
  it('slug => {success,data} com url de mockup preservada', async () => {
    prismaMock.artwork.findMany.mockResolvedValue([
      {
        id: 'art-1',
        title: 'Mandala',
        category: { id: 'c1', name: 'Cat', slug: 'cat', color: null, showInFilter: true, filterOrder: 0 },
        tags: [],
        files: [
          { id: 'p', format: Format.PNG, url: 'https://cdn/m.png', size: 1, artworkId: 'art-1' },
          { id: 'c', format: Format.CDR, url: 'https://r2/x.cdr', size: 1, artworkId: 'art-1' },
        ],
        _count: { downloads: 0 },
      },
    ])

    const res = await GET(new Request('http://localhost/api/artworks?slug=mandala'))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data[0].files.find((f: { id: string }) => f.id === 'c').url).toBeUndefined()
  })
})
