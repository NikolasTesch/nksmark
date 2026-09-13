// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { navMock } = vi.hoisted(() => {
  let search = ''
  return {
    navMock: {
      replace: vi.fn(),
      getSearch: () => search,
      setSearch: (s: string) => {
        search = s
      },
    },
  }
})

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navMock.getSearch()),
  useRouter: () => ({ replace: navMock.replace }),
  usePathname: () => '/loja',
}))

import { useArtworkFilters } from './useArtworkFilters'

beforeEach(() => {
  navMock.setSearch('')
  navMock.replace.mockClear()
})

describe('useArtworkFilters — derivado de useSearchParams (RF-5)', () => {
  it('deriva filtros e page da URL', () => {
    navMock.setSearch('cat=c1&tag=t1&free=1&fav=1&sort=downloads&page=2&q=flor')
    const { result } = renderHook(() => useArtworkFilters())
    expect(result.current.filters.categoryId).toBe('c1')
    expect(result.current.filters.tagId).toBe('t1')
    expect(result.current.filters.isFree).toBe(true)
    expect(result.current.filters.onlyFavorites).toBe(true)
    expect(result.current.filters.sort).toBe('downloads')
    expect(result.current.page).toBe(2)
  })

  it('setCategory escreve na URL e zera page (trocar filtro reseta page)', () => {
    navMock.setSearch('page=3')
    const { result } = renderHook(() => useArtworkFilters())
    act(() => result.current.setCategory('c1'))
    expect(navMock.replace).toHaveBeenCalledWith('/loja?cat=c1', { scroll: false })
  })

  it('setSort zera page', () => {
    const { result } = renderHook(() => useArtworkFilters())
    act(() => result.current.setSort('az'))
    expect(navMock.replace).toHaveBeenCalledWith('/loja?sort=az', { scroll: false })
  })

  it('setPage NÃO zera page e escreve page na URL', () => {
    const { result } = renderHook(() => useArtworkFilters())
    act(() => result.current.setPage(4))
    expect(navMock.replace).toHaveBeenCalledWith('/loja?page=4', { scroll: false })
  })

  it('resetFilters limpa tudo (inclusive page)', () => {
    navMock.setSearch('cat=c1&free=1&page=2&q=x')
    const { result } = renderHook(() => useArtworkFilters())
    act(() => result.current.resetFilters())
    expect(navMock.replace).toHaveBeenCalledWith('/loja', { scroll: false })
  })
})
