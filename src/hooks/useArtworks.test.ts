// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useArtworks } from './useArtworks'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('useArtworks (T-4: sem /api/artworks/search)', () => {
  it('consome o novo contrato {items,total,page,pageSize}', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ items: [{ id: 'a' }], total: 1, page: 1, pageSize: 40 }),
    } as Response)

    const { result } = renderHook(() => useArtworks())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.artworks).toHaveLength(1)
  })

  it('aceita o contrato legado {success,data} (admin/slug)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [{ id: 'b' }] }),
    } as Response)

    const { result } = renderHook(() => useArtworks({ admin: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.artworks[0].id).toBe('b')
  })

  it('não chama /api/artworks/search mesmo com search', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ items: [], total: 0, page: 1, pageSize: 40 }),
    } as Response)

    const { result } = renderHook(() => useArtworks({ search: 'floral' }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const calledUrls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]))
    expect(calledUrls.some((u) => u.includes('/api/artworks/search'))).toBe(false)
  })
})
