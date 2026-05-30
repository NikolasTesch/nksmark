import { useState, useEffect, useCallback } from 'react'

export interface AdminMetricsData {
  categories: Array<{ id: string; name: string }>
  selectedFilters: {
    month: number
    year: number
    categoryId: string
  }
  stats: {
    totalDownloads: number
    avgDownloadsPerDay: number
    avgDownloadsPerUser: number
    avgDownloadsPerArtwork: number
    totalActiveUsers: number
    percentChangeFromPrevMonth: number
  }
  dailyTrend: Array<{
    day: number
    count: number
  }>
  formatDistribution: Array<{
    format: string
    count: number
    percentage: number
  }>
  categoryDistribution: Array<{
    id: string
    name: string
    color: string | null
    count: number
    percentage: number
  }>
  topArtworks: Array<{
    id: string
    title: string
    categoryName: string
    downloadsCount: number
  }>
}

export interface AdminMetricsFilters {
  month: number
  year: number
  categoryId: string
}

export function useAdminMetrics() {
  const now = new Date()
  const [filters, setFilters] = useState<AdminMetricsFilters>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    categoryId: 'all',
  })
  const [data, setData] = useState<AdminMetricsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({
        month: filters.month.toString(),
        year: filters.year.toString(),
        categoryId: filters.categoryId,
      })
      const res = await fetch(`/api/admin/metrics?${queryParams.toString()}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Erro ao carregar métricas administrativas.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao carregar métricas do admin.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    refresh: fetchMetrics,
  }
}
