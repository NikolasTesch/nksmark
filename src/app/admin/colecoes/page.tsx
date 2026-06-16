'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Collection } from '@prisma/client'
import {
  Plus,
  Edit3,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  Check,
  X,
  ChevronRight,
  Layers,
  Calendar,
  Search,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

// Coleção + contagem de artes (vem do _count do GET /api/collections).
type CollectionRow = Collection & { _count: { artworks: number } }

export default function ColecoesAdminPage() {
  const [collections, setCollections] = React.useState<CollectionRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [searchQuery, setSearchQuery] = React.useState('')
  const [showCreateForm, setShowCreateForm] = React.useState(false)

  // Inline create form state
  const [newTitle, setNewTitle] = React.useState('')
  const [newSlug, setNewSlug] = React.useState('')
  const [newDescription, setNewDescription] = React.useState('')
  const [slugAuto, setSlugAuto] = React.useState(true)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)

  // Inline edit state
  const [editingSlug, setEditingSlug] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState('')
  const [editDescription, setEditDescription] = React.useState('')

  const fetchCollections = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/collections', { cache: 'no-store' })
      const result = await res.json()
      if (result.success) {
        setCollections(result.data as CollectionRow[])
      } else {
        setError(result.error || 'Erro ao buscar coleções.')
      }
    } catch (err) {
      console.error('Error fetching collections:', err)
      setError('Erro de comunicação com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  // Auto-gera slug a partir do título (mínimo útil para o usuário ver a URL).
  const autoSlugify = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')

  // Atualiza o slug automaticamente enquanto o usuário digita o título (a menos
  // que ele tenha editado manualmente o slug após a auto-geração).
  React.useEffect(() => {
    if (slugAuto) {
      setNewSlug(autoSlugify(newTitle))
    }
  }, [newTitle, slugAuto])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: newSlug.trim() || undefined,
          description: newDescription.trim() || undefined,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setCollections((prev) => [result.data as CollectionRow, ...prev])
        setNewTitle('')
        setNewSlug('')
        setNewDescription('')
        setSlugAuto(true)
        setShowCreateForm(false)
      } else {
        setActionError(result.error || 'Erro ao criar coleção.')
      }
    } catch (err) {
      console.error('Error creating collection:', err)
      setActionError('Erro de comunicação com o servidor.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteConfirm = async (slug: string) => {
    setPendingDeleteId(null)
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/collections/${slug}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setCollections((prev) => prev.filter((c) => c.slug !== slug))
      } else {
        setActionError(result.error || 'Erro ao excluir coleção.')
      }
    } catch (err) {
      console.error('Error deleting collection:', err)
      setActionError('Erro de comunicação com o servidor.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartEdit = (col: CollectionRow) => {
    setEditingSlug(col.slug)
    setEditTitle(col.title)
    setEditDescription(col.description || '')
  }

  const handleCancelEdit = () => {
    setEditingSlug(null)
    setEditTitle('')
    setEditDescription('')
  }

  const handleSaveEdit = async (originalSlug: string) => {
    if (!editTitle.trim()) return
    setActionLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/collections/${originalSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setCollections((prev) =>
          prev.map((c) =>
            c.slug === originalSlug ? ({ ...c, ...(result.data as Collection) } as CollectionRow) : c,
          ),
        )
        setEditingSlug(null)
      } else {
        setActionError(result.error || 'Erro ao atualizar coleção.')
      }
    } catch (err) {
      console.error('Error updating collection:', err)
      setActionError('Erro de comunicação com o servidor.')
    } finally {
      setActionLoading(false)
    }
  }

  // Filtro client-side por título ou slug.
  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return collections
    return collections.filter(
      (c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    )
  }, [collections, searchQuery])

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-nks-gray-200/50">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] font-black uppercase tracking-tight text-nks-black leading-none">
            Coleções
          </h1>
          <p className="text-xs font-semibold text-nks-gray-400 mt-1">
            {loading ? '...' : collections.length.toLocaleString('pt-BR')}{' '}
            {collections.length === 1 ? 'coleção cadastrada' : 'coleções cadastradas'}.
          </p>
        </div>

        <Button
          onClick={() => {
            setShowCreateForm((v) => !v)
            setActionError(null)
          }}
          className="rounded-lg font-display font-black uppercase tracking-wider text-xs gap-1.5 h-10 px-5 bg-nks-red hover:bg-nks-red-dark text-white shadow-nks-sm cursor-pointer active:scale-[0.98] border-none transition-all"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" /> Nova coleção
        </Button>
      </div>

      {(error || actionError) && (
        <div className="bg-nks-red-subtle border border-nks-red p-4 rounded-xl flex items-center gap-3 text-xs font-semibold text-nks-red-dark shadow-nks-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      {/* Inline create form */}
      {showCreateForm && (
        <div className="bg-white border border-nks-gray-200 p-6 rounded-xl shadow-nks-sm flex flex-col gap-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
            <Plus className="h-4 w-4 text-nks-red" /> Nova coleção
          </span>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Título
              </label>
              <Input
                type="text"
                placeholder="Ex: Coleção Verão 2026"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-lg"
                required
                maxLength={100}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Slug (URL)
              </label>
              <Input
                type="text"
                placeholder="colecao-verao-2026"
                value={newSlug}
                onChange={(e) => {
                  setSlugAuto(false)
                  setNewSlug(e.target.value)
                }}
                className="rounded-lg font-mono text-xs"
                maxLength={100}
                pattern="[a-z0-9\-]+"
              />
              <p className="text-[10px] text-nks-gray-400 font-semibold">
                Gerado automaticamente a partir do título. Pode ser editado manualmente.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Descrição (opcional)
              </label>
              <textarea
                placeholder="Curta descrição da coleção…"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-lg border border-nks-gray-200 bg-white px-3.5 py-2.5 text-xs text-nks-black focus:outline-none focus:ring-1 focus:ring-nks-red focus:border-nks-red font-semibold transition-colors resize-none"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                disabled={actionLoading || !newTitle.trim()}
                className="font-display font-black uppercase tracking-wider text-xs h-10 px-5 rounded-lg bg-nks-red hover:bg-nks-red-dark text-white shadow-nks-sm border-none"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Criar coleção
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewTitle('')
                  setNewSlug('')
                  setNewDescription('')
                  setSlugAuto(true)
                }}
                className="h-10 px-4 rounded-lg border border-nks-gray-200 text-xs font-bold"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="bg-white border border-nks-gray-200 p-4 rounded-xl shadow-nks-sm flex items-center gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-nks-gray-400" />
          <input
            type="text"
            placeholder="Buscar coleção por título ou slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-nks-gray-200 bg-nks-gray-100/50 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-nks-red/20 focus:border-nks-red placeholder:text-nks-gray-400 font-semibold text-nks-black transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading && collections.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-9 w-9 animate-spin text-nks-red" />
        </div>
      ) : (
        <div className="border border-nks-gray-200 rounded-xl overflow-hidden bg-white shadow-nks-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-nks-black text-white border-b border-nks-gray-200 font-display font-extrabold text-[11px] uppercase tracking-[0.08em]">
                  <th className="py-3.5 px-4">Coleção</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4 text-center">Artes</th>
                  <th className="py-3.5 px-4">Criada em</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nks-gray-200">
                {filtered.map((c) => {
                  const isEditing = editingSlug === c.slug
                  const isDeleting = pendingDeleteId === c.slug
                  return (
                    <tr key={c.id} className="hover:bg-nks-gray-100/30 transition-colors align-top">
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 max-w-md">
                            <Input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="rounded-lg h-9 text-xs"
                              maxLength={100}
                              required
                            />
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full rounded-lg border border-nks-gray-200 bg-white px-3 py-2 text-xs text-nks-black focus:outline-none focus:ring-1 focus:ring-nks-red focus:border-nks-red font-semibold resize-none"
                              rows={2}
                              maxLength={500}
                              placeholder="Descrição (opcional)"
                            />
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                onClick={() => handleSaveEdit(c.slug)}
                                disabled={actionLoading || !editTitle.trim()}
                                size="sm"
                                className="h-8 px-2.5 gap-1 text-[10px] font-black bg-nks-red hover:bg-nks-red-dark text-white rounded-lg border-none"
                              >
                                {actionLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}{' '}
                                Salvar
                              </Button>
                              <Button
                                type="button"
                                onClick={handleCancelEdit}
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 gap-1 text-[10px] font-bold border border-nks-gray-200 rounded-lg"
                              >
                                <X className="h-3 w-3" /> Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5 max-w-md">
                            <Link
                              href={`/admin/colecoes/${c.slug}`}
                              className="font-bold text-nks-black hover:text-nks-red transition-colors flex items-center gap-1.5"
                            >
                              <FolderOpen className="h-3.5 w-3.5 text-nks-red shrink-0" />
                              {c.title}
                            </Link>
                            {c.description && (
                              <p className="text-[11px] text-nks-gray-400 font-medium line-clamp-1 leading-snug">
                                {c.description}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-nks-gray-700 font-semibold">
                        /{c.slug}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border font-display tracking-wider ${
                            c._count.artworks > 0
                              ? 'bg-nks-red-subtle text-nks-red border-nks-red/20'
                              : 'bg-nks-gray-100 text-nks-gray-400 border-nks-gray-200'
                          }`}
                        >
                          <Layers className="h-2.5 w-2.5" />
                          {c._count.artworks}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-nks-gray-700 font-semibold whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-nks-gray-400" />
                          {formatDate(c.createdAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] font-bold text-nks-red hidden sm:block">
                              Excluir?
                            </span>
                            <Button
                              onClick={() => handleDeleteConfirm(c.slug)}
                              disabled={actionLoading}
                              size="sm"
                              className="h-8 px-2.5 gap-1 text-[10px] font-black bg-nks-red hover:bg-nks-red-dark text-white rounded-lg border-none"
                            >
                              {actionLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}{' '}
                              Sim
                            </Button>
                            <Button
                              onClick={() => setPendingDeleteId(null)}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 border border-nks-gray-200 rounded-lg text-[10px] font-bold"
                            >
                              <X className="h-3 w-3" /> Não
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/admin/colecoes/${c.slug}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={actionLoading || isEditing}
                                className="h-8 w-8 border border-nks-gray-200 bg-white text-nks-gray-700 hover:text-nks-black hover:bg-nks-gray-50 hover:border-nks-gray-300 rounded-lg cursor-pointer"
                                title="Gerenciar artes"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              onClick={() => handleStartEdit(c)}
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading}
                              className="h-8 w-8 border border-nks-gray-200 bg-white text-nks-gray-700 hover:text-nks-black hover:bg-nks-gray-50 hover:border-nks-gray-300 rounded-lg cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => setPendingDeleteId(c.slug)}
                              variant="ghost"
                              size="icon"
                              disabled={actionLoading}
                              className="h-8 w-8 border border-nks-gray-200 bg-white text-nks-gray-400 hover:text-nks-red hover:bg-nks-red-subtle/40 hover:border-nks-red/20 rounded-lg cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-nks-gray-400 font-semibold text-xs"
                    >
                      {searchQuery
                        ? 'Nenhuma coleção encontrada para esta busca.'
                        : 'Nenhuma coleção cadastrada. Crie a primeira usando o botão acima.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
