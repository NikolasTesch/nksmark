// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    artwork: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    category: { findMany: vi.fn() },
    tag: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('./LojaView', () => ({ LojaView: () => null }))
vi.mock('@/components/layout/Header', () => ({ Header: () => null }))
vi.mock('@/components/layout/Footer', () => ({ Footer: () => null }))
vi.mock('@/components/shared/LoadingGrid', () => ({ LoadingGrid: () => null }))

import LojaPage from './page'

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.artwork.findMany.mockResolvedValue([])
  prismaMock.artwork.count.mockResolvedValue(0)
  prismaMock.artwork.groupBy.mockResolvedValue([])
  prismaMock.category.findMany.mockResolvedValue([])
  prismaMock.tag.findMany.mockResolvedValue([])
})

describe('LojaPage (Server Component) — smoke', () => {
  it('resolve e dispara busca server-side (helper + agregações)', async () => {
    const el = await LojaPage({ searchParams: Promise.resolve({ cat: 'c1', page: '2' }) })
    expect(el).toBeTruthy()
    expect(prismaMock.artwork.findMany).toHaveBeenCalled()
    expect(prismaMock.category.findMany).toHaveBeenCalled()
    expect(prismaMock.tag.findMany).toHaveBeenCalled()
    expect(prismaMock.artwork.groupBy).toHaveBeenCalled()
  })
})
