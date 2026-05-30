'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FormatBadge } from '@/components/artwork/FormatBadge'
import { CategoryBadge } from '@/components/shared/CategoryBadge'
import { ArtworkWithRelations } from '@/types/artwork'
import { Status, Category } from '@prisma/client'
import { Plus, Edit3, Trash2, Eye, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { useArtworks } from '@/hooks/useArtworks'
import { formatDate } from '@/lib/utils/format'

const mockCategories: Category[] = [
  { id: 'c1', name: 'Estampas', slug: 'estampas', color: '#10b981', showInFilter: true, filterOrder: 1 },
  { id: 'c2', name: 'Fontes', slug: 'fontes', color: '#ec4899', showInFilter: true, filterOrder: 2 },
  { id: 'c3', name: 'Vetores', slug: 'vetores', color: '#3b82f6', showInFilter: true, filterOrder: 3 },
]

const mockArtworks: ArtworkWithRelations[] = [
  {
    id: 'f1',
    title: 'Estampa Camiseta Automotiva Vintage Car',
    slug: 'estampa-camiseta-automotiva-vintage-car',
    description: 'Vetor completo de altíssima definição para sublimação e serigrafia.',
    status: Status.PUBLISHED,
    isFree: true,
    previewUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c1',
    category: mockCategories[0],
    tags: [],
    files: [{ id: 'file1', format: 'CDR', url: '#', size: 12500000, artworkId: 'f1' }],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'f2',
    title: 'Pacote Fontes Caligráficas para Casamentos',
    slug: 'pacote-fontes-caligraficas-para-casamentos',
    description: 'Arquivos de fontes em formato OTF com curvas elegantes.',
    status: Status.PUBLISHED,
    isFree: false,
    previewUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60',
    categoryId: 'c2',
    category: mockCategories[1],
    tags: [],
    files: [{ id: 'file3', format: 'OTF', url: '#', size: 450000, artworkId: 'f2' }],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export default function ArtesAdminPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const { artworks: dbArtworks, loading, error, deleteArtwork } = useArtworks({
    admin: true,
    search: searchQuery || undefined
  })
  
  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const artworks = dbArtworks.length > 0 ? dbArtworks : (searchQuery ? [] : mockArtworks)

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir esta arte permanentemente? Todos os arquivos vinculados serão removidos.')) {
      setActionLoading(true)
      setActionError(null)
      const result = await deleteArtwork(id)
      setActionLoading(false)
      if (!result.success) {
        setActionError(result.error || 'Erro ao excluir arte do banco.')
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-1">
            Gerenciar Catálogo de Artes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cadastre, edite e acompanhe todas as artes e arquivos originais disponíveis na plataforma.
          </p>
        </div>

        <Link href="/admin/artes/nova">
          <Button className="rounded-xl font-bold gap-1.5 h-10 px-5 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
            <Plus className="h-4.5 w-4.5" /> Cadastrar Arte
          </Button>
        </Link>
      </div>

      {(error || actionError) && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-4 rounded-xl flex items-center gap-3 text-sm text-red-800 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar arte por título ou descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-slate-400"
        />
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        {loading && dbArtworks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Formatos</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {artworks.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="relative h-10 w-14 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50">
                        <Image
                          src={item.previewUrl || '/placeholder.jpg'}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {item.title}
                          {item.isFree && (
                            <span className="inline-flex items-center gap-0.5 bg-emerald-500 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                              <Sparkles className="h-2 w-2" /> Grátis
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Criada em {formatDate(item.createdAt)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <CategoryBadge name={item.category.name} color={item.category.color} />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.files.map((file) => (
                          <FormatBadge key={file.id} format={file.format} />
                        ))}
                        {item.files.length === 0 && (
                          <span className="text-xs text-slate-400 italic">Nenhum</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        item.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/20'
                          : item.status === 'DRAFT'
                            ? 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border border-slate-200/20'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/20'
                      }`}>
                        {item.status === 'PUBLISHED' ? 'Publicado' : item.status === 'DRAFT' ? 'Rascunho' : 'Arquivado'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/loja/${item.slug}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 rounded-lg cursor-pointer" title="Ver no site">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <Link href={`/admin/artes/${item.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 rounded-lg cursor-pointer" title="Editar">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <Button 
                          onClick={() => handleDelete(item.id)} 
                          variant="ghost" 
                          size="icon" 
                          disabled={actionLoading}
                          className="h-8 w-8 text-red-500 rounded-lg cursor-pointer hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {artworks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">Nenhuma arte encontrada no catálogo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
