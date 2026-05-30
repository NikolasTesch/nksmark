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
          <h1 className="font-display text-[26px] font-extrabold uppercase tracking-tight text-nks-black mb-1">
            Gerenciar Catálogo de Artes
          </h1>
          <p className="text-xs font-semibold text-nks-gray-700">
            Cadastre, edite e acompanhe todas as artes e arquivos originais disponíveis na plataforma.
          </p>
        </div>

        <Link href="/admin/artes/nova">
          <Button className="rounded-sm font-display font-extrabold uppercase tracking-wider text-xs gap-1.5 h-10 px-5 bg-nks-red hover:bg-nks-red-dark text-white shadow-nks-sm cursor-pointer active:scale-[0.99] border-none">
            <Plus className="h-4.5 w-4.5" /> Cadastrar Arte
          </Button>
        </Link>
      </div>

      {(error || actionError) && (
        <div className="bg-nks-red-subtle border border-nks-red p-4 rounded-sm flex items-center gap-3 text-xs font-semibold text-nks-red-dark">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="bg-white border border-nks-gray-200 p-4 rounded-sm shadow-nks-sm flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar arte por título ou descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow rounded-sm border border-nks-gray-200 bg-nks-gray-100/50 px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-nks-red focus:border-nks-red placeholder:text-nks-gray-400 font-medium text-nks-black"
        />
      </div>

      <div className="border border-nks-gray-200 rounded-sm overflow-hidden bg-white shadow-nks-sm">
        {loading && dbArtworks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-nks-black text-white border-b border-nks-gray-200 font-display font-extrabold text-[11px] uppercase tracking-[0.08em]">
                  <th className="py-3.5 px-4">Preview</th>
                  <th className="py-3.5 px-4">Título</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">Formatos</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nks-gray-200">
                {artworks.map((item) => (
                  <tr key={item.id} className="hover:bg-nks-gray-100/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="relative h-10 w-14 rounded-sm overflow-hidden border border-nks-gray-200 bg-nks-gray-100 shrink-0">
                        <Image
                          src={item.previewUrl || '/placeholder.jpg'}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-nks-black flex items-center gap-1.5">
                          {item.title}
                          {item.isFree && (
                            <span className="inline-flex items-center gap-0.5 bg-nks-red text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm font-display tracking-wider">
                              <Sparkles className="h-2 w-2" /> Grátis
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-nks-gray-400 font-semibold mt-0.5">Criada em {formatDate(item.createdAt)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <CategoryBadge name={item.category.name} color={item.category.color} />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.files.map((file) => (
                          <FormatBadge key={file.id} format={file.format} />
                        ))}
                        {item.files.length === 0 && (
                          <span className="text-[11px] text-nks-gray-400 italic font-medium">Nenhum</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-sm text-[9px] font-extrabold uppercase border font-display tracking-wider ${
                        item.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'DRAFT'
                            ? 'bg-nks-gray-100 text-nks-gray-700 border-nks-gray-200'
                            : 'bg-red-50 text-nks-red border-red-200'
                      }`}>
                        {item.status === 'PUBLISHED' ? 'Publicado' : item.status === 'DRAFT' ? 'Rascunho' : 'Arquivado'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/loja/${item.slug}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-nks-gray-700 hover:text-nks-black hover:bg-nks-gray-100 border border-nks-gray-200 rounded-sm cursor-pointer" title="Ver no site">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <Link href={`/admin/artes/${item.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-nks-red hover:text-nks-red-dark hover:bg-nks-red-subtle border border-nks-red/20 rounded-sm cursor-pointer" title="Editar">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <Button 
                          onClick={() => handleDelete(item.id)} 
                          variant="ghost" 
                          size="icon" 
                          disabled={actionLoading}
                          className="h-8 w-8 text-nks-red hover:text-nks-red-dark hover:bg-nks-red-subtle border border-nks-red/20 rounded-sm cursor-pointer hover:bg-nks-red-subtle/50"
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
                    <td colSpan={6} className="py-8 text-center text-nks-gray-400 font-semibold text-xs">Nenhuma arte encontrada no catálogo.</td>
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
