import { useState, useEffect, useCallback } from 'react'
import { ArtworkWithRelations } from '@/types/artwork'

interface UseArtworksOptions {
  categoryId?: string
  tagId?: string
  search?: string
  isFree?: boolean
  lazy?: boolean
  admin?: boolean
}

export function useArtworks(options: UseArtworksOptions = {}) {
  const [artworks, setArtworks] = useState<ArtworkWithRelations[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchArtworks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.categoryId) params.append('categoryId', options.categoryId)
      if (options.tagId) params.append('tagId', options.tagId)
      if (options.search) params.append('search', options.search)
      if (options.isFree !== undefined) params.append('isFree', String(options.isFree))
      if (options.admin) params.append('admin', 'true')

      const res = await fetch(`/api/artworks?${params.toString()}`)
      const result = await res.json()

      if (result.success) {
        setArtworks(result.data)
      } else {
        setError(result.error || 'Erro ao carregar catálogo.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao se conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }, [options.categoryId, options.tagId, options.search, options.isFree, options.admin])

  useEffect(() => {
    if (!options.lazy) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial on-mount (sincroniza com a API)
      fetchArtworks()
    }
  }, [fetchArtworks, options.lazy])

  const deleteArtwork = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/artworks/${id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (result.success) {
        setArtworks((prev) => prev.filter((art) => art.id !== id))
        return { success: true }
      } else {
        setError(result.error || 'Erro ao excluir arte.')
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao excluir arte.')
      return { success: false, error: 'Erro de conexão' }
    }
  }

  return {
    artworks,
    loading,
    error,
    deleteArtwork,
    refresh: fetchArtworks,
  }
}
