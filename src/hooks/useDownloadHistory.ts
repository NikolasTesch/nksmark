import { useState, useEffect, useCallback } from 'react'

export interface DownloadHistoryItem {
  id: string
  artworkId: string
  artworkSlug?: string
  artworkTitle: string
  previewUrl: string
  format: string
  downloadedAt: string
}

export function useDownloadHistory() {
  const [history, setHistory] = useState<DownloadHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const res = await fetch('/api/downloads')
      const result = await res.json()
      if (result.success) {
        setHistory(result.data)
      } else {
        setError(result.error ?? 'Erro ao carregar histórico.')
        setHistory([])
      }
    } catch {
      setError('Falha na comunicação com o servidor.')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  return {
    history,
    loading,
    error,
    refresh: fetchHistory,
  }
}
