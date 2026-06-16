import { useState, useEffect, useCallback } from 'react'

export interface SupportTicket {
  id: string
  name: string
  email: string
  message: string
  status: 'PENDING' | 'RESOLVED'
  createdAt: string
  updatedAt: string
}

export function useAdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/support')
      const result = await res.json()
      if (result.success) {
        setTickets(result.data)
      } else {
        setError(result.error || 'Erro ao carregar os chamados de suporte.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao carregar os chamados.')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStatus = useCallback(async (id: string, status: 'PENDING' | 'RESOLVED') => {
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await res.json()
      if (result.success) {
        setTickets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status } : t))
        )
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Erro ao atualizar o chamado.' }
      }
    } catch (err) {
      console.error(err)
      return { success: false, error: 'Erro de conexão ao atualizar o chamado.' }
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return {
    tickets,
    loading,
    error,
    refresh: fetchTickets,
    updateStatus,
  }
}
