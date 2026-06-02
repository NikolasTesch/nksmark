'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArtworkFormNks } from '@/components/admin/ArtworkFormNks'
import { Category } from '@prisma/client'
import { ArtworkWithRelations } from '@/types/artwork'
import { AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function EditarArtePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [artwork, setArtwork] = React.useState<ArtworkWithRelations | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [fetchError, setFetchError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchInitData = async () => {
      setLoading(true)
      setFetchError(null)
      try {
        const [catRes, artRes] = await Promise.all([
          fetch('/api/categories'),
          fetch(`/api/artworks/${id}`),
        ])

        const cats = await catRes.json()
        const art = await artRes.json()

        if (cats.success) {
          setCategories(cats.data)
        }

        if (art.success) {
          setArtwork(art.data)
        } else {
          setFetchError(art.error || 'Arte não encontrada no catálogo.')
        }
      } catch {
        setFetchError('Erro de comunicação com o servidor.')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchInitData()
    }
  }, [id, router])

  const initialData = React.useMemo(() => {
    if (!artwork) return null
    return {
      title: artwork.title,
      description: artwork.description || '',
      categoryId: artwork.categoryId,
      status: artwork.status,
      isFree: artwork.isFree,
      previewUrl: artwork.previewUrl,
      tags: artwork.tags.map((t) => ({ name: t.name })),
      files: artwork.files.map((f) => ({ id: f.id, format: f.format, size: f.size, url: f.url })),
    }
  }, [artwork])

  if (loading) {
    return (
      <div className="flex items-center py-20 justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        <div className="flex items-center gap-3 bg-nks-red-subtle border border-nks-red/20 px-5 py-4 rounded text-nks-red-dark text-sm font-semibold max-w-md">
          <AlertCircle className="h-5 w-5 shrink-0 text-nks-red" />
          <span>{fetchError}</span>
        </div>
        <Link href="/admin/artes">
          <Button variant="outline" size="sm">← Voltar para as artes</Button>
        </Link>
      </div>
    )
  }

  return (
    <ArtworkFormNks
      mode="edit"
      artworkId={id}
      categories={categories}
      initialData={initialData}
    />
  )
}
