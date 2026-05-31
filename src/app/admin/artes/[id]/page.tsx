'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArtworkFormNks } from '@/components/admin/ArtworkFormNks'
import { Category } from '@prisma/client'
import { ArtworkWithRelations } from '@/types/artwork'
import { Loader2 } from 'lucide-react'

export default function EditarArtePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [artwork, setArtwork] = React.useState<ArtworkWithRelations | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchInitData = async () => {
      setLoading(true)
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
          alert('Erro ao carregar detalhes da arte: ' + (art.error || 'Não encontrada'))
          router.push('/admin/artes')
        }
      } catch (err) {
        console.error(err)
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
      files: artwork.files.map((f) => ({ id: f.id, format: f.format, size: f.size })),
    }
  }, [artwork])

  if (loading) {
    return (
      <div className="flex items-center py-20 justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
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
