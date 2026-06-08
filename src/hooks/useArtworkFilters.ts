'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArtworkFilterState, ArtworkSort } from '@/types/artwork'

// Os filtros vivem na URL (?cat=&tag=&q=&free=1&fav=1&sort=) para que uma busca
// seja compartilhável e sobreviva ao refresh — padrão dos marketplaces de referência.
// A API surface (filters + setters) é a mesma de antes, então a loja não muda.
const DEFAULT_SORT: ArtworkSort = 'recent'
const VALID_SORTS: ArtworkSort[] = ['recent', 'downloads', 'az', 'free']

export function useArtworkFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters: ArtworkFilterState = useMemo(() => {
    const sortParam = searchParams.get('sort') as ArtworkSort | null
    return {
      categoryId: searchParams.get('cat') || undefined,
      tagId: searchParams.get('tag') || undefined,
      search: searchParams.get('q') || '',
      isFree: searchParams.get('free') === '1' ? true : undefined,
      onlyFavorites: searchParams.get('fav') === '1' ? true : undefined,
      sort: sortParam && VALID_SORTS.includes(sortParam) ? sortParam : DEFAULT_SORT,
    }
  }, [searchParams])

  // Aplica uma mutação ao querystring e troca a URL sem empilhar histórico nem rolar a página.
  const updateParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const setCategory = useCallback(
    (categoryId?: string) => updateParams((p) => (categoryId ? p.set('cat', categoryId) : p.delete('cat'))),
    [updateParams]
  )

  const setTag = useCallback(
    (tagId?: string) => updateParams((p) => (tagId ? p.set('tag', tagId) : p.delete('tag'))),
    [updateParams]
  )

  const setSearch = useCallback(
    (search: string) => updateParams((p) => (search ? p.set('q', search) : p.delete('q'))),
    [updateParams]
  )

  const setIsFree = useCallback(
    (isFree?: boolean) => updateParams((p) => (isFree ? p.set('free', '1') : p.delete('free'))),
    [updateParams]
  )

  const setOnlyFavorites = useCallback(
    (onlyFavorites?: boolean) => updateParams((p) => (onlyFavorites ? p.set('fav', '1') : p.delete('fav'))),
    [updateParams]
  )

  const setSort = useCallback(
    (sort: ArtworkSort) =>
      updateParams((p) => (sort && sort !== DEFAULT_SORT ? p.set('sort', sort) : p.delete('sort'))),
    [updateParams]
  )

  const resetFilters = useCallback(() => {
    // Preserva apenas a ordenação; zera os demais critérios.
    updateParams((p) => {
      p.delete('cat')
      p.delete('tag')
      p.delete('q')
      p.delete('free')
      p.delete('fav')
    })
  }, [updateParams])

  return {
    filters,
    setCategory,
    setTag,
    setSearch,
    setIsFree,
    setOnlyFavorites,
    setSort,
    resetFilters,
  }
}
