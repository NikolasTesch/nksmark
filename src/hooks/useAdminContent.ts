import { useState, useEffect, useCallback } from 'react'
import { Category, Tag } from '@prisma/client'

export function useAdminContent() {
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchContent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/tags')
      ])

      const cats = await catRes.json()
      const tgs = await tagRes.json()

      if (cats.success) setCategories(cats.data)
      if (tgs.success) setTags(tgs.data)
    } catch (err) {
      console.error('Error fetching content:', err)
      setError('Erro ao carregar categorias e tags.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial on-mount (sincroniza com a API)
    fetchContent()
  }, [fetchContent])

  const addCategory = async (name: string, color: string) => {
    setError(null)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      const result = await res.json()
      if (result.success) {
        setCategories((prev) => [...prev, result.data])
        return { success: true }
      } else {
        setError(result.error || 'Erro ao criar categoria.')
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao processar criação de categoria.')
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const updateCategory = async (id: string, data: Partial<Category>) => {
    setError(null)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        setCategories((prev) => prev.map((c) => (c.id === id ? result.data : c)))
        return { success: true }
      } else {
        setError(result.error || 'Erro ao atualizar categoria.')
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao processar atualização de categoria.')
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const deleteCategory = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (result.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id))
        return { success: true }
      } else {
        setError(result.error || 'Erro ao excluir categoria.')
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao excluir categoria.')
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const addTag = async (name: string) => {
    setError(null)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result = await res.json()
      if (result.success) {
        // Tag list update, preventing duplicates
        setTags((prev) => {
          if (prev.some((t) => t.id === result.data.id)) return prev
          return [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name))
        })
        return { success: true }
      } else {
        setError(result.error || 'Erro ao criar tag.')
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao processar criação de tag.')
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const deleteTag = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (result.success) {
        setTags((prev) => prev.filter((t) => t.id !== id))
        return { success: true }
      } else {
        setError(result.error || 'Erro ao excluir tag.')
        return { success: false, error: result.error }
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao excluir tag.')
      return { success: false, error: 'Erro de conexão' }
    }
  }

  return {
    categories,
    tags,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    deleteTag,
    refresh: fetchContent
  }
}
