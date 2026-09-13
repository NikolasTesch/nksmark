import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Format } from '@prisma/client'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { findMany: vi.fn(), count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))

import { fetchArtworkPage } from './query'
import type { ArtworkQuery } from '@/lib/validations/artwork-query'

function makeItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `art-${i}`,
    title: `Arte ${i}`,
    slug: `arte-${i}`,
    description: null,
    previewUrl: 'https://cdn/x.png',
    priceCents: 0,
    isFree: true,
    categoryId: 'c1',
    createdAt: new Date(),
    category: { id: 'c1', name: 'Cat', slug: 'cat', color: null },
    tags: [],
    files: [{ id: `f-${i}`, format: Format.PNG, url: 'https://cdn/m.png', size: 1, artworkId: `art-${i}` }],
    _count: { downloads: i },
  }))
}

const baseQuery: ArtworkQuery = {
  q: undefined,
  categoryId: undefined,
  tagId: undefined,
  isFree: undefined,
  onlyFavorites: undefined,
  sort: 'recent',
  page: 1,
  pageSize: 40,
  ids: undefined,
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.artwork.count.mockResolvedValue(0)
  prismaMock.artwork.findMany.mockResolvedValue([])
  prismaMock.$queryRaw.mockResolvedValue([])
})

describe('fetchArtworkPage — caminho Prisma (sem q)', () => {
  it('retorna items/total/page/pageSize e aplica skip/take (CA-3)', async () => {
    prismaMock.artwork.count.mockResolvedValue(100)
    prismaMock.artwork.findMany.mockResolvedValue(makeItems(40))

    const res = await fetchArtworkPage({ ...baseQuery, pageSize: 40 })

    expect(res.total).toBe(100)
    expect(res.items).toHaveLength(40)
    expect(res.page).toBe(1)
    expect(res.pageSize).toBe(40)
    expect(prismaMock.artwork.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 40 })
  })

  it('mapeia sort para orderBy (RF-6 / requisito 5)', async () => {
    prismaMock.artwork.count.mockResolvedValue(1)
    prismaMock.artwork.findMany.mockResolvedValue(makeItems(1))

    await fetchArtworkPage({ ...baseQuery, sort: 'downloads' })
    expect(prismaMock.artwork.findMany.mock.calls[0][0].orderBy).toEqual({ downloads: { _count: 'desc' } })

    await fetchArtworkPage({ ...baseQuery, sort: 'az' })
    expect(prismaMock.artwork.findMany.mock.calls[1][0].orderBy).toEqual({ title: 'asc' })

    await fetchArtworkPage({ ...baseQuery, sort: 'free' })
    expect(prismaMock.artwork.findMany.mock.calls[2][0].orderBy).toEqual({ isFree: 'desc' })
  })

  it('mantém status=PUBLISHED (RF-2)', async () => {
    prismaMock.artwork.count.mockResolvedValue(0)
    prismaMock.artwork.findMany.mockResolvedValue([])
    await fetchArtworkPage(baseQuery)
    expect(prismaMock.artwork.findMany.mock.calls[0][0].where.status).toBe('PUBLISHED')
  })

  it('filtra por ids quando onlyFavorites (RF-4)', async () => {
    prismaMock.artwork.count.mockResolvedValue(2)
    prismaMock.artwork.findMany.mockResolvedValue(makeItems(2))
    await fetchArtworkPage({ ...baseQuery, onlyFavorites: true, ids: ['x', 'y'] })
    expect(prismaMock.artwork.findMany.mock.calls[0][0].where.id).toEqual({ in: ['x', 'y'] })
  })

  it('onlyFavorites sem ids => 0 resultados', async () => {
    const res = await fetchArtworkPage({ ...baseQuery, onlyFavorites: true, ids: [] })
    expect(res.total).toBe(0)
    expect(res.items).toHaveLength(0)
  })

  it('remove a url de arquivos que não são mockup (PNG/JPG)', async () => {
    prismaMock.artwork.count.mockResolvedValue(1)
    prismaMock.artwork.findMany.mockResolvedValue([
      {
        ...makeItems(1)[0],
        files: [
          { id: 'p', format: Format.PNG, url: 'https://cdn/m.png', size: 1, artworkId: 'art-0' },
          { id: 'c', format: Format.CDR, url: 'https://r2/secret.cdr', size: 1, artworkId: 'art-0' },
        ],
      },
    ])
    const res = await fetchArtworkPage(baseQuery)
    const files = res.items[0].files as Array<{ id: string; url?: string }>
    expect(files.find((f) => f.id === 'p')?.url).toBe('https://cdn/m.png')
    expect(files.find((f) => f.id === 'c')?.url).toBeUndefined()
  })
})

describe('fetchArtworkPage — caminho FTS (q>=2)', () => {
  it('usa $queryRaw com ts_rank e COUNT(*) OVER() e retorna total', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ id: 'art-0', total: 5 }, { id: 'art-1', total: 5 }])
    prismaMock.artwork.findMany.mockResolvedValue(makeItems(2))

    const res = await fetchArtworkPage({ ...baseQuery, q: 'flor' })

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1)
    expect(res.total).toBe(5)
    expect(res.items).toHaveLength(2)
  })

  it('normaliza página fora do intervalo (RF-2 / CA-2)', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ id: 'art-0', total: 5 }])

    const res = await fetchArtworkPage({ ...baseQuery, q: 'flor', page: 999, pageSize: 40 })

    // total=5 => 1 página; safePage vira 1 e o FTS é re-executado.
    expect(res.page).toBe(1)
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2)
  })

  it('FTS com ids (favoritos) não quebra com token não-numérico (CA-6)', async () => {
    prismaMock.$queryRaw.mockResolvedValue([])
    const res = await fetchArtworkPage({ ...baseQuery, q: "a'; DROP--", onlyFavorites: true, ids: ['abc', 'def'] })
    // Não lança; parâmetro é ligado (bound) no Prisma.sql.
    expect(res.items).toHaveLength(0)
    expect(prismaMock.$queryRaw).toHaveBeenCalled()
  })
})
