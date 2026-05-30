'use client'

import * as React from 'react'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { ArtworkWithRelations } from '@/types/artwork'
import { Status } from '@prisma/client'
import { useArtworks } from '@/hooks/useArtworks'
import { LoadingGrid } from '@/components/shared/LoadingGrid'
import { Sparkles } from 'lucide-react'

const mockFreeArtworks: ArtworkWithRelations[] = [
  {
    id: 'f1',
    title: 'Estampa Camiseta Automotiva Vintage Car',
    slug: 'estampa-camiseta-automotiva-vintage-car',
    description: 'Vetor completo de altíssima definição para sublimação e serigrafia. Ajustado em curvas perfeitas com paletas harmônicas de azul e dourado vintage.',
    status: Status.PUBLISHED,
    isFree: true,
    previewUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c1',
    category: { id: 'c1', name: 'Estampas', slug: 'estampas', color: '#10b981', showInFilter: true, filterOrder: 1 },
    tags: [{ id: 't1', name: 'sublimacao' }],
    files: [
      { id: 'file1', format: 'CDR', url: '#', size: 12500000, artworkId: 'f1' }
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
    category: { id: 'c3', name: 'Vetores', slug: 'vetores', color: '#3b82f6', showInFilter: true, filterOrder: 3 },
    tags: [{ id: 't2', name: 'esportivo' }],
    files: [
      { id: 'file4', format: 'AI', url: '#', size: 24500000, artworkId: 'f3' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export default function GratisPage() {
  const { artworks: dbArtworks, loading } = useArtworks({ isFree: true })
  
  const artworks = dbArtworks.length > 0 ? dbArtworks : mockFreeArtworks

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="h-3.5 w-3.5" /> Acesso Aberto Equipe
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
          Artes Gratuitas
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Esta seção cataloga exclusivamente os arquivos da plataforma liberados inteiramente de forma gratuita para a equipe.
        </p>
      </div>

      <div className="mt-4">
        {loading ? (
          <LoadingGrid count={4} />
        ) : (
          <ArtworkGrid artworks={artworks} />
        )}
      </div>
    </div>
  )
}
