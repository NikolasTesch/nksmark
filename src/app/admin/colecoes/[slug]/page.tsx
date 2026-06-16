'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog'
import { Artwork, Category, File as PrismaFile, Tag, CollectionArtwork } from '@prisma/client'
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Search,
  Image as ImageIcon,
  Layers,
  Calendar,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { ArtworkWithRelations } from '@/types/artwork'
import Image from 'next/image'

// Tipagem do item da coleção retornado pelo GET /api/collections/[slug]
type CollectionItem = CollectionArtwork & {
  artwork: Artwork & {
    files: PrismaFile[]
    category: Category
    tags: Tag[]
  }
}

type CollectionDetail = {
  id: string
  title: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
  artworks: CollectionItem[]
}

export default function ColecaoDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const [collection, setCollection] = React.useState<CollectionDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Modal de adicionar arte
  const [addModalOpen, setAddModalOpen] = React.useState(false)
  const [allArtworks, setAllArtworks] = React.useState<ArtworkWithRelations[]>([])
  const [artworksLoading, setArtworksLoading] = React.useState(false)
  const [artworkSearch, setArtworkSearch] = React.useState('')
  const [addingId, setAddingId] = React.useState<string | null>(null)
  const [addError, setAddError] = React.useState<string | null>(null)

  // Ações em linha
  const [pendingRemoveId, setPendingRemoveId] = React.useState<string | null>(null)
  const [reorderLoadingId, setReorderLoadingId] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const fetchCollection = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/collections/${slug}`, { cache: 'no-store' })
      const result = await res.json()
      if (result.success) {
        setCollection(result.data as CollectionDetail)
      } else {
        setError(result.error || 'Coleção não encontrada.')
      }
    } catch (err) {
      console.error('Error fetching collection:', err)
      setError('Erro de comunicação com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [slug])

  React.useEffect(() => {
    if (slug) {
      fetchCollection()
    }
  }, [slug, fetchCollection])

  const openAddModal = async () => {
    setAddModalOpen(true)
    setAddError(null)
    setArtworkSearch('')
    if (allArtworks.length === 0) {
      setArtworksLoading(true)
      try {
        const res = await fetch('/api/artworks?admin=true', { cache: 'no-store' })
        const result = await res.json()
        if (result.success) {
          setAllArtworks(result.data as ArtworkWithRelations[])
        }
      } catch (err) {
        console.error('Error loading artworks:', err)
      } finally {
        setArtworksLoading(false)
      }
    }
  }

  const handleAddArtwork = async (artworkId: string) => {
    setAddingId(artworkId)
    setAddError(null)
    try {
      const res = await fetch(`/api/collections/${slug}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId }),
      })
      const result = await res.json()
      if (result.success) {
        // Fecha o modal e re-busca a coleção para refletir a nova ordem (max+1 no backend).
        setAddModalOpen(false)
        await fetchCollection()
      } else {
        setAddError(result.error || 'Erro ao adicionar arte à coleção.')
      }
    } catch (err) {
      console.error('Error adding artwork:', err)
      setAddError('Erro de comunicação com o servidor.')
    } finally {
      setAddingId(null)
    }
  }

  const handleRemoveConfirm = async (artworkId: string) => {
    setPendingRemoveId(null)
    setActionError(null)
    try {
      const res = await fetch(`/api/collections/${slug}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId }),
      })
      const result = await res.json()
      if (result.success) {
        setCollection((prev) => {
          if (!prev) return prev
          const filtered = prev.artworks.filter((a) => a.artworkId !== artworkId)
          // Reordena localmente para manter a UI consistente após a remoção.
          return {
            ...prev,
            artworks: filtered.map((a, idx) => ({ ...a, order: idx })),
          }
        })
      } else {
        setActionError(result.error || 'Erro ao remover arte.')
      }
    } catch (err) {
      console.error('Error removing artwork:', err)
      setActionError('Erro de comunicação com o servidor.')
    }
  }

  const handleMove = async (artworkId: string, direction: 'up' | 'down') => {
    if (!collection) return
    const items = collection.artworks
    const idx = items.findIndex((a) => a.artworkId === artworkId)
    if (idx === -1) return

    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= items.length) return

    setReorderLoadingId(artworkId)
    setActionError(null)
    try {
      const res = await fetch(`/api/collections/${slug}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId, order: newIdx }),
      })
      const result = await res.json()
      if (result.success) {
        // Recarrega para garantir que a ordem persistida é a exibida.
        await fetchCollection()
      } else {
        setActionError(result.error || 'Erro ao reordenar.')
      }
    } catch (err) {
      console.error('Error reordering:', err)
      setActionError('Erro de comunicação com o servidor.')
    } finally {
      setReorderLoadingId(null)
    }
  }

  // Filtro de busca no modal: por título ou categoria.
  const filteredArtworks = React.useMemo(() => {
    if (!collection) return []
    const inCollection = new Set(collection.artworks.map((a) => a.artworkId))
    const q = artworkSearch.trim().toLowerCase()
    return allArtworks
      .filter((a) => !inCollection.has(a.id))
      .filter((a) => {
        if (!q) return true
        return (
          a.title.toLowerCase().includes(q) ||
          a.category.name.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q)
        )
      })
      .slice(0, 50) // Limita a renderização para performance.
  }, [allArtworks, collection, artworkSearch])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-9 w-9 animate-spin text-nks-red" />
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex items-center gap-3 bg-nks-red-subtle border border-nks-red/20 px-5 py-4 rounded-xl text-nks-red-dark text-sm font-semibold max-w-md">
          <AlertCircle className="h-5 w-5 shrink-0 text-nks-red" />
          <span>{error || 'Coleção não encontrada.'}</span>
        </div>
        <Link href="/admin/colecoes">
          <Button variant="ghost" size="sm" className="rounded-lg border border-nks-gray-200">
            <ChevronLeft className="h-4 w-4" /> Voltar para coleções
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      {/* Breadcrumb + voltar */}
      <Link
        href="/admin/colecoes"
        className="text-xs font-semibold text-nks-gray-400 hover:text-nks-red transition-colors flex items-center gap-1 w-fit"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Voltar para Coleções
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 pb-4 border-b border-nks-gray-200/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="font-display text-[28px] font-black uppercase tracking-tight text-nks-black leading-none flex items-center gap-2 truncate">
              <FolderOpen className="h-6 w-6 text-nks-red shrink-0" />
              <span className="truncate">{collection.title}</span>
            </h1>
            <p className="text-xs font-semibold text-nks-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-nks-gray-700">/{collection.slug}</span>
              <span className="text-nks-gray-200">•</span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" /> {collection.artworks.length}{' '}
                {collection.artworks.length === 1 ? 'arte' : 'artes'}
              </span>
              <span className="text-nks-gray-200">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDate(collection.createdAt)}
              </span>
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="rounded-lg font-display font-black uppercase tracking-wider text-xs gap-1.5 h-10 px-5 bg-nks-red hover:bg-nks-red-dark text-white shadow-nks-sm cursor-pointer active:scale-[0.98] border-none transition-all shrink-0"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> Adicionar arte
          </Button>
        </div>
        {collection.description && (
          <p className="text-sm text-nks-gray-700 leading-relaxed max-w-3xl mt-2">
            {collection.description}
          </p>
        )}
      </div>

      {actionError && (
        <div className="bg-nks-red-subtle border border-nks-red p-4 rounded-xl flex items-center gap-3 text-xs font-semibold text-nks-red-dark shadow-nks-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Lista de artes */}
      {collection.artworks.length === 0 ? (
        <div className="bg-white border border-nks-gray-200 rounded-xl p-12 text-center flex flex-col items-center gap-3 shadow-nks-sm">
          <Layers className="h-10 w-10 text-nks-gray-200" />
          <p className="text-sm font-semibold text-nks-gray-700">
            Esta coleção ainda não tem artes.
          </p>
          <p className="text-xs text-nks-gray-400">
            Clique em <span className="font-bold text-nks-red">Adicionar arte</span> para começar.
          </p>
        </div>
      ) : (
        <div className="border border-nks-gray-200 rounded-xl overflow-hidden bg-white shadow-nks-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-nks-black text-white border-b border-nks-gray-200 font-display font-extrabold text-[11px] uppercase tracking-[0.08em]">
                  <th className="py-3.5 px-3 w-14 text-center">#</th>
                  <th className="py-3.5 px-4">Arte</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nks-gray-200">
                {collection.artworks.map((item, idx) => {
                  const art = item.artwork
                  const isRemoving = pendingRemoveId === art.id
                  const isReordering = reorderLoadingId === art.id
                  const isFirst = idx === 0
                  const isLast = idx === collection.artworks.length - 1
                  return (
                    <tr
                      key={art.id}
                      className="hover:bg-nks-gray-100/30 transition-colors"
                    >
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-nks-gray-100 text-nks-black font-mono font-bold text-xs border border-nks-gray-200">
                          {item.order}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 rounded-md overflow-hidden border border-nks-gray-200 bg-nks-gray-100 shrink-0">
                            {art.previewUrl ? (
                              <Image
                                src={art.previewUrl}
                                alt={art.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-nks-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <Link
                              href={`/admin/artes/${art.id}`}
                              className="font-bold text-nks-black hover:text-nks-red transition-colors text-sm leading-tight line-clamp-1"
                            >
                              {art.title}
                            </Link>
                            <span className="text-[10px] text-nks-gray-400 font-mono mt-0.5">
                              /{art.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border font-display tracking-wider"
                          style={{
                            backgroundColor: art.category.color
                              ? `${art.category.color}20`
                              : '#F2F2F2',
                            color: art.category.color || '#3D3D3D',
                            borderColor: art.category.color
                              ? `${art.category.color}40`
                              : '#DEDEDE',
                          }}
                        >
                          {art.category.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[9px] font-display font-black tracking-wider border ${
                            art.status === 'PUBLISHED'
                              ? 'bg-[#E8F8F0] text-[#10B981] border-[#D1F2E1]'
                              : art.status === 'DRAFT'
                                ? 'bg-[#FEF6E9] text-[#F59E0B] border-[#FDEBD0]'
                                : 'bg-[#F2F2F2] text-[#777777] border-[#E5E5E5]'
                          }`}
                        >
                          {art.status === 'PUBLISHED'
                            ? 'ATIVO'
                            : art.status === 'DRAFT'
                              ? 'RASCUNHO'
                              : 'INATIVO'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isRemoving ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] font-bold text-nks-red hidden sm:block">
                              Remover?
                            </span>
                            <Button
                              onClick={() => handleRemoveConfirm(art.id)}
                              size="sm"
                              className="h-8 px-2.5 gap-1 text-[10px] font-black bg-nks-red hover:bg-nks-red-dark text-white rounded-lg border-none"
                            >
                              <Check className="h-3 w-3" /> Sim
                            </Button>
                            <Button
                              onClick={() => setPendingRemoveId(null)}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 border border-nks-gray-200 rounded-lg text-[10px] font-bold"
                            >
                              <X className="h-3 w-3" /> Não
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              onClick={() => handleMove(art.id, 'up')}
                              disabled={isFirst || isReordering}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 border border-nks-gray-200 bg-white text-nks-gray-700 hover:text-nks-black hover:bg-nks-gray-50 hover:border-nks-gray-300 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Mover para cima"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              onClick={() => handleMove(art.id, 'down')}
                              disabled={isLast || isReordering}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 border border-nks-gray-200 bg-white text-nks-gray-700 hover:text-nks-black hover:bg-nks-gray-50 hover:border-nks-gray-300 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => setPendingRemoveId(art.id)}
                              variant="ghost"
                              size="icon"
                              disabled={isReordering}
                              className="h-8 w-8 border border-nks-gray-200 bg-white text-nks-gray-400 hover:text-nks-red hover:bg-nks-red-subtle/40 hover:border-nks-red/20 rounded-lg cursor-pointer"
                              title="Remover da coleção"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de adicionar arte */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogClose onClick={() => setAddModalOpen(false)} />
          <DialogHeader>
            <DialogTitle>Adicionar arte à coleção</DialogTitle>
            <p className="text-xs text-nks-gray-400 font-semibold mt-1">
              Selecione uma arte do catálogo para incluir em{' '}
              <span className="text-nks-red font-bold">{collection.title}</span>.
            </p>
          </DialogHeader>

          {addError && (
            <div className="bg-nks-red-subtle border border-nks-red/20 px-4 py-3 rounded-md flex items-center gap-2 text-xs font-semibold text-nks-red-dark">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-nks-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, categoria ou slug..."
              value={artworkSearch}
              onChange={(e) => setArtworkSearch(e.target.value)}
              className="w-full rounded-lg border border-nks-gray-200 bg-nks-gray-100/50 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-nks-red/20 focus:border-nks-red placeholder:text-nks-gray-400 font-semibold text-nks-black transition-all"
            />
          </div>

          <div className="max-h-[420px] overflow-y-auto border border-nks-gray-200 rounded-lg divide-y divide-nks-gray-200">
            {artworksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-nks-red" />
              </div>
            ) : filteredArtworks.length === 0 ? (
              <div className="py-12 text-center text-xs text-nks-gray-400 font-semibold">
                {artworkSearch
                  ? 'Nenhuma arte encontrada para esta busca.'
                  : 'Todas as artes já estão nesta coleção.'}
              </div>
            ) : (
              filteredArtworks.map((art) => (
                <div
                  key={art.id}
                  className="flex items-center gap-3 p-3 hover:bg-nks-gray-100/40 transition-colors"
                >
                  <div className="relative h-12 w-12 rounded-md overflow-hidden border border-nks-gray-200 bg-nks-gray-100 shrink-0">
                    {art.previewUrl ? (
                      <Image
                        src={art.previewUrl}
                        alt={art.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-nks-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-nks-black text-xs leading-tight line-clamp-1">
                      {art.title}
                    </span>
                    <span className="text-[10px] text-nks-gray-400 font-mono mt-0.5 line-clamp-1">
                      /{art.slug} • {art.category.name}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleAddArtwork(art.id)}
                    disabled={addingId === art.id}
                    size="sm"
                    className="h-8 px-3 gap-1 text-[10px] font-black bg-nks-red hover:bg-nks-red-dark text-white rounded-lg border-none"
                  >
                    {addingId === art.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}{' '}
                    Adicionar
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddModalOpen(false)}
              className="h-10 px-4 rounded-lg border border-nks-gray-200 text-xs font-bold"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
