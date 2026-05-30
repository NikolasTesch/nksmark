'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArtworkForm } from '@/components/admin/ArtworkForm'
import { Category, Status } from '@prisma/client'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const mockCategories: Category[] = [
  { id: 'c1', name: 'Estampas', slug: 'estampas', color: '#10b981', showInFilter: true, filterOrder: 1 },
  { id: 'c2', name: 'Fontes', slug: 'fontes', color: '#ec4899', showInFilter: true, filterOrder: 2 },
  { id: 'c3', name: 'Vetores', slug: 'vetores', color: '#3b82f6', showInFilter: true, filterOrder: 3 },
]

export default function EditarArtePage() {
  const { id } = useParams()
  const router = useRouter()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [artworkData, setArtworkData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchInitData = async () => {
      setLoading(true)
      try {
        const [catRes, artRes] = await Promise.all([
          fetch('/api/categories'),
          fetch(`/api/artworks/${id}`)
        ])
        
        const cats = await catRes.json()
        const art = await artRes.json()

        if (cats.success && cats.data.length > 0) {
          setCategories(cats.data)
        } else {
          setCategories(mockCategories)
        }

        if (art.success) {
          setArtworkData(art.data)
        } else {
          alert('Erro ao carregar detalhes da arte: ' + (art.error || 'Não encontrada'))
          router.push('/admin/artes')
        }
      } catch (err) {
        console.error(err)
        setCategories(mockCategories)
      } finally {
        setLoading(false)
      }
    }
    
    if (id) {
      fetchInitData()
    }
  }, [id, router])

  const initialData = React.useMemo(() => {
    if (!artworkData) return null
    return {
      title: artworkData.title,
      description: artworkData.description || '',
      categoryId: artworkData.categoryId,
      status: artworkData.status as Status,
      isFree: artworkData.isFree,
      tags: artworkData.tags || [],
    }
  }, [artworkData])

  const handleSubmit = async (formData: Record<string, unknown>, files: File[]) => {
    try {
      const res = await fetch(`/api/artworks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar alterações no banco.')
      }
      
      alert('Arte atualizada com sucesso!')
      router.push('/admin/artes')
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Erro ao atualizar arte.')
      throw e
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      <div>
        <Link href="/admin/artes" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-primary transition-colors mb-2">
          <ChevronLeft className="h-4 w-4" /> Voltar para Listagem
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-1.5">
          Editar Arte Existente
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Modifique as informações gerais da arte ou gerencie seus arquivos de download.
        </p>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center py-12 justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <ArtworkForm
            categories={categories}
            tags={[]}
            initialData={initialData}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
