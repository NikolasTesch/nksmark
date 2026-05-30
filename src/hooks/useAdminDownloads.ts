import { useState, useEffect, useCallback } from 'react'

export interface AdminDownloadLog {
  id: string
  userName: string
  userEmail: string
  artworkTitle: string
  format: string
  createdAt: string
}

export function useAdminDownloads() {
  const [downloads, setDownloads] = useState<AdminDownloadLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDownloads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/downloads')
      const result = await res.json()
      if (result.success) {
        setDownloads(result.data)
      } else {
        setError(result.error || 'Erro ao carregar o log de downloads.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao carregar o log de downloads.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDownloads()
  }, [fetchDownloads])

  return {
    downloads,
    loading,
    error,
    refresh: fetchDownloads
  }
}
