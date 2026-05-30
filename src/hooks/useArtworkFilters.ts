import { useState, useCallback } from 'react'
import { ArtworkFilterState } from '@/types/artwork'

export function useArtworkFilters() {
  const [filters, setFilters] = useState<ArtworkFilterState>({
    categoryId: undefined,
    tagId: undefined,
    search: '',
    isFree: undefined,
  })

  const setCategory = useCallback((categoryId?: string) => {
    setFilters((prev) => ({ ...prev, categoryId }))
  }, [])

  const setTag = useCallback((tagId?: string) => {
    setFilters((prev) => ({ ...prev, tagId }))
  }, [])

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }))
  }, [])

  const setIsFree = useCallback((isFree?: boolean) => {
    setFilters((prev) => ({ ...prev, isFree }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      categoryId: undefined,
      tagId: undefined,
      search: '',
      isFree: undefined,
    })
  }, [])

  return {
    filters,
    setCategory,
    setTag,
    setSearch,
    setIsFree,
    resetFilters,
  }
}
