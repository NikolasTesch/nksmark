'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArtworkFilterState, ArtworkSort } from '@/types/artwork'

// Fonte de verdade = URL (?cat=&tag=&q=&free=1&fav=1&sort=&page=). Trocar
// qualquer filtro zera `page` (RF-5 / requisito 1).
const DEFAULT_SORT: ArtworkSort = 'recent'
const VALID_SORTS: ArtworkSort[] = ['recent', 'downloads', 'az', 'free']
const SEARCH_DEBOUNCE_MS = 350

export function useArtworkFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Input local para resposta instantânea no campo de texto; o sync com a URL
  // é feito com debounce (RF-5).
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')

  const filters: ArtworkFilterState = useMemo(() => {
    const sortParam = searchParams.get('sort') as ArtworkSort | null
    const search = searchParams.get('q') || ''
    return {
      categoryId: searchParams.get('cat') || undefined,
      tagId: searchParams.get('tag') || undefined,
      search,
      isFree: searchParams.get('free') === '1' ? true : undefined,
      onlyFavorites: searchParams.get('fav') === '1' ? true : undefined,
      sort: sortParam && VALID_SORTS.includes(sortParam) ? sortParam : DEFAULT_SORT,
      // FTS implícito quando a busca tem 2+ caracteres (decidido no servidor).
      fts: search.length >= 2 ? true : undefined,
    }
  }, [searchParams])

  const page = useMemo(() => {
    const p = Number(searchParams.get('page'))
    return Number.isFinite(p) && p >= 1 ? p : 1
  }, [searchParams])

  // Sincroniza o input local com a URL quando a navegação externa (back/forward) muda os parâmetros.
  useEffect(() => {
    setSearchInput(searchParams.get('q') || '')
  }, [searchParams])

  // Aplica uma mutação ao querystring e troca a URL sem empilhar histórico nem rolar a página.
  // `resetPage` zera a paginação em qualquer troca de filtro (requisito 1).
  const updateParams = useCallback(
    (mutate: (p: URLSearchParams) => void, resetPage = false) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      if (resetPage) params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const setCategory = useCallback(
    (categoryId?: string) =>
      updateParams((p) => (categoryId ? p.set('cat', categoryId) : p.delete('cat')), true),
    [updateParams]
  )

  const setTag = useCallback(
    (tagId?: string) => updateParams((p) => (tagId ? p.set('tag', tagId) : p.delete('tag')), true),
    [updateParams]
  )

  const setSearch = useCallback(
    (search: string) => {
      setSearchInput(search)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        updateParams((p) => {
          if (search) p.set('q', search)
          else p.delete('q')
        }, true)
      }, SEARCH_DEBOUNCE_MS)
    },
    [updateParams]
  )

  const setIsFree = useCallback(
    (isFree?: boolean) =>
      updateParams((p) => (isFree ? p.set('free', '1') : p.delete('free')), true),
    [updateParams]
  )

  const setOnlyFavorites = useCallback(
    (onlyFavorites?: boolean) =>
      updateParams((p) => (onlyFavorites ? p.set('fav', '1') : p.delete('fav')), true),
    [updateParams]
  )

  const setSort = useCallback(
    (sort: ArtworkSort) =>
      updateParams(
        (p) => (sort && sort !== DEFAULT_SORT ? p.set('sort', sort) : p.delete('sort')),
        true
      ),
    [updateParams]
  )

  const setPage = useCallback(
    (next: number) => updateParams((p) => (next > 1 ? p.set('page', String(next)) : p.delete('page'))),
    [updateParams]
  )

  const resetFilters = useCallback(() => {
    setSearchInput('')
    updateParams((p) => {
      p.delete('cat')
      p.delete('tag')
      p.delete('q')
      p.delete('free')
      p.delete('fav')
      p.delete('sort')
      p.delete('page')
    })
  }, [updateParams])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return {
    filters,
    page,
    searchInput,
    setCategory,
    setTag,
    setSearch,
    setIsFree,
    setOnlyFavorites,
    setSort,
    setPage,
    resetFilters,
  }
}
