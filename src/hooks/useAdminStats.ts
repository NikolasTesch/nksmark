import { useState, useEffect, useCallback } from 'react'

export interface AdminStatsData {
  stats: {
    artworks: number
    downloads: number
    categories: number
    users: number
  }
  recentDownloads: Array<{
    id: string
    email: string
    art: string
    format: string
    time: string
  }>
}

export function useAdminStats() {
  const [data, setData] = useState<AdminStatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Erro ao carregar estatísticas do painel.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao carregar dados do admin.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial on-mount (sincroniza com a API)
    fetchStats()
  }, [fetchStats])

  return {
    data,
    loading,
    error,
    refresh: fetchStats
  }
}
