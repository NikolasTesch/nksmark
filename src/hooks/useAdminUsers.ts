import { useState, useEffect, useCallback } from 'react'
import { User } from '@prisma/client'

export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users')
      const result = await res.json()
      if (result.success) {
        setUsers(result.data)
      } else {
        setError(result.error || 'Erro ao carregar lista de usuários.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial on-mount (sincroniza com a API)
    fetchUsers()
  }, [fetchUsers])

  const createUser = async (name: string, email: string, role: string, password: string) => {
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, password }),
      })
      const result = await res.json()
      if (result.success) {
        setUsers((prev) => [result.data, ...prev])
        return { success: true }
      } else {
        setError(result.error || 'Erro ao cadastrar usuário.')
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao cadastrar usuário.')
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const deleteUser = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== id))
        return { success: true }
      } else {
        setError(result.error || 'Erro ao excluir usuário.')
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao excluir usuário.')
      return { success: false, error: 'Erro de conexão' }
    }
  }

  return {
    users,
    loading,
    error,
    createUser,
    deleteUser,
    refresh: fetchUsers
  }
}
