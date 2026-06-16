'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArtworkFilterState, ArtworkSort } from '@/types/artwork'

// Os filtros vivem na URL (?cat=&tag=&q=&free=1&fav=1&sort=) para que uma busca
// seja compartilhável e sobreviva ao refresh — padrão dos marketplaces de referência.
// A API surface (filters + setters) é a mesma de antes, então a loja não muda.
const DEFAULT_SORT: ArtworkSort = 'recent'
const VALID_SORTS: ArtworkSort[] = ['recent', 'downloads', 'az', 'free']
const SEARCH_DEBOUNCE_MS = 350

export function useArtworkFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Local search input para resposta instantânea no campo de texto.
  // O sync com a URL é feito com debounce para evitar chamadas excessivas à API.
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')

  const filters: ArtworkFilterState = useMemo(() => {
    const sortParam = searchParams.get('sort') as ArtworkSort | null
    return {
      categoryId: searchParams.get('cat') || undefined,
      tagId: searchParams.get('tag') || undefined,
      search: searchParams.get('q') || '',
      isFree: searchParams.get('free') === '1' ? true : undefined,
      onlyFavorites: searchParams.get('fav') === '1' ? true : undefined,
      sort: sortParam && VALID_SORTS.includes(sortParam) ? sortParam : DEFAULT_SORT,
      fts: searchParams.get('fts') === 'true' ? true : undefined,
    }
  }, [searchParams])

  // Sincroniza o input local com a URL quando a navegação externa (back/forward) muda os parâmetros.
  useEffect(() => {
    setSearchInput(searchParams.get('q') || '')
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
    (search: string) => {
      // Atualiza o input local imediatamente para resposta visual instantânea.
      setSearchInput(search)

      // Debounce da atualização da URL para evitar excesso de chamadas à API.
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (search) {
          params.set('q', search)
          if (search.length >= 2) {
            params.set('fts', 'true')
          } else {
            params.delete('fts')
          }
        } else {
          params.delete('q')
          params.delete('fts')
        }
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }, SEARCH_DEBOUNCE_MS)
    },
    [router, pathname, searchParams]
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
    // Limpa também o input local imediatamente.
    setSearchInput('')
    updateParams((p) => {
      p.delete('cat')
      p.delete('tag')
      p.delete('q')
      p.delete('free')
      p.delete('fav')
      p.delete('fts')
    })
  }, [updateParams])

  // Limpa o timer de debounce no unmount.
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return {
    filters,
    searchInput,
    setCategory,
    setTag,
    setSearch,
    setIsFree,
    setOnlyFavorites,
    setSort,
    resetFilters,
  }
}
