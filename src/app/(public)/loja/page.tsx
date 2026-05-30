'use client'

import * as React from 'react'
import { ArtworkFilters } from '@/components/artwork/ArtworkFilters'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { LoadingGrid } from '@/components/shared/LoadingGrid'
import { ArtworkWithRelations } from '@/types/artwork'
import { Category, Tag, Status } from '@prisma/client'
import { useArtworkFilters } from '@/hooks/useArtworkFilters'
import { useArtworks } from '@/hooks/useArtworks'

const mockCategories: Category[] = [
  { id: 'c1', name: 'Estampas', slug: 'estampas', color: '#10b981', showInFilter: true, filterOrder: 1 },
  { id: 'c2', name: 'Fontes', slug: 'fontes', color: '#ec4899', showInFilter: true, filterOrder: 2 },
  { id: 'c3', name: 'Vetores', slug: 'vetores', color: '#3b82f6', showInFilter: true, filterOrder: 3 },
  { id: 'c4', name: 'Logos', slug: 'logos', color: '#f59e0b', showInFilter: true, filterOrder: 4 },
]

const mockTags: Tag[] = [
  { id: 't1', name: 'sublimacao' },
  { id: 't2', name: 'automotivo' },
  { id: 't3', name: 'casamento' },
  { id: 't4', name: 'esportivo' },
]

const mockArtworks: ArtworkWithRelations[] = [
  {
    id: 'f1',
    title: 'Estampa Camiseta Automotiva Vintage Car',
    slug: 'estampa-camiseta-automotiva-vintage-car',
    description: 'Vetor completo de altíssima definição para sublimação e serigrafia. Ajustado em curvas perfeitas com paletas harmônicas de azul e dourado vintage.',
    status: Status.PUBLISHED,
    isFree: true,
    previewUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c1',
    category: mockCategories[0],
    tags: [mockTags[0], mockTags[1]],
    files: [
      { id: 'file1', format: 'CDR', url: '#', size: 12500000, artworkId: 'f1' },
      { id: 'file2', format: 'AI', url: '#', size: 18400000, artworkId: 'f1' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'f2',
    title: 'Pacote Fontes Caligráficas para Casamentos',
    slug: 'pacote-fontes-caligraficas-para-casamentos',
    description: 'Arquivos de fontes em formato OTF com curvas elegantes e ligaduras completas para convites de luxo, marcas de noivas e lettering decorativo.',
    status: Status.PUBLISHED,
    isFree: false,
    previewUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c2',
    category: mockCategories[1],
    tags: [mockTags[2]],
    files: [
      { id: 'file3', format: 'OTF', url: '#', size: 450000, artworkId: 'f2' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'f3',
    title: 'Kit Vetores Logotipos Esportivos 2026',
    slug: 'kit-vetores-logotipos-esportivos-2026',
    description: 'Vetores esportivos geométricos e dinâmicos para equipes de corrida, futebol, e-sports e marcas atléticas. Totalmente adaptáveis em Corel e Illustrator.',
    status: Status.PUBLISHED,
    isFree: true,
    previewUrl: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c3',
    category: mockCategories[2],
    tags: [mockTags[3]],
    files: [
      { id: 'file4', format: 'AI', url: '#', size: 24500000, artworkId: 'f3' },
      { id: 'file5', format: 'PDF', url: '#', size: 15100000, artworkId: 'f3' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'f4',
    title: 'Logotipo Vintage Barber Shop',
    slug: 'logotipo-vintage-barber-shop',
    description: 'Logotipo clássico de barbearia vintage com ornamentos elegantes, navalha e lettering retro. Vetorizado em Corel e Illustrator.',
    status: Status.PUBLISHED,
    isFree: false,
    previewUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c4',
    category: mockCategories[3],
    tags: [mockTags[0]],
    files: [
      { id: 'file6', format: 'CDR', url: '#', size: 8400000, artworkId: 'f4' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export default function LojaPage() {
  const { filters, setCategory, setTag, setSearch, setIsFree, resetFilters } = useArtworkFilters()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [tags, setTags] = React.useState<Tag[]>([])

  const { artworks: dbArtworks, loading } = useArtworks({
    categoryId: filters.categoryId,
    tagId: filters.tagId,
    search: filters.search,
    isFree: filters.isFree
  })

  React.useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.length > 0) setCategories(res.data)
        else setCategories(mockCategories)
      })
      .catch(() => setCategories(mockCategories))

    fetch('/api/tags')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.length > 0) setTags(res.data)
        else setTags(mockTags)
      })
      .catch(() => setTags(mockTags))
  }, [])

  const artworks = dbArtworks.length > 0 ? dbArtworks : mockArtworks

  const filteredArtworks = React.useMemo(() => {
    if (dbArtworks.length > 0) return dbArtworks

    return artworks.filter((art) => {
      if (filters.categoryId && art.categoryId !== filters.categoryId) return false
      if (filters.tagId && !art.tags.some((t) => t.id === filters.tagId)) return false
      if (filters.isFree !== undefined && art.isFree !== filters.isFree) return false
      if (filters.search) {
        const query = filters.search.toLowerCase()
        const matchTitle = art.title.toLowerCase().includes(query)
        const matchDesc = art.description?.toLowerCase().includes(query) || false
        if (!matchTitle && !matchDesc) return false
      }
      return true
    })
  }, [dbArtworks, artworks, filters])

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <span className="nks-eyebrow">Catálogo NKS Art</span>
        <h1 className="font-display font-bold uppercase tracking-[-0.015em] text-2xl md:text-3xl text-nks-black mt-2 mb-2">
          Todas as artes
        </h1>
        <p className="text-sm text-nks-gray-700">
          Navegue por categoria ou busque por tag. Abra a arte para ver formatos e baixar.
        </p>
      </div>

      <ArtworkFilters
        categories={categories}
        tags={tags}
        selectedCategory={filters.categoryId}
        selectedTag={filters.tagId}
        search={filters.search || ''}
        isFree={filters.isFree}
        onCategorySelect={setCategory}
        onTagSelect={setTag}
        onSearchChange={setSearch}
        onIsFreeSelect={setIsFree}
        onReset={resetFilters}
      />

      {loading ? (
        <LoadingGrid count={8} />
      ) : (
        <ArtworkGrid artworks={filteredArtworks} onResetFilters={resetFilters} />
      )}
    </div>
  )
}
