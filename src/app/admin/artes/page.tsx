'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArtworkWithRelations } from '@/types/artwork'
import { Status, Category } from '@prisma/client'
import { Plus, Edit3, Trash2, Sparkles, Loader2, AlertCircle, Image as ImageIcon, Search } from 'lucide-react'
import Image from 'next/image'
import { useArtworks } from '@/hooks/useArtworks'

export default function ArtesAdminPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const { artworks: dbArtworks, loading, error, deleteArtwork } = useArtworks({
    admin: true,
    search: searchQuery || undefined
  })
  
  const [actionLoading, setActionLoading] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const artworks = dbArtworks

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
      
      {/* Header section matching the mockup */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-nks-gray-200/50">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] font-black uppercase tracking-tight text-nks-black leading-none">
            Artes
          </h1>
          <p className="text-xs font-semibold text-nks-gray-400 mt-1">
            {loading ? '...' : dbArtworks.length.toLocaleString('pt-BR')} artes no catálogo.
          </p>
        </div>

        <Link href="/admin/artes/nova">
          <Button className="rounded-lg font-display font-black uppercase tracking-wider text-xs gap-1.5 h-10 px-5 bg-nks-red hover:bg-nks-red-dark text-white shadow-nks-sm cursor-pointer active:scale-[0.98] border-none transition-all">
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" /> Nova arte
          </Button>
        </Link>
      </div>

      {(error || actionError) && (
        <div className="bg-nks-red-subtle border border-nks-red p-4 rounded-xl flex items-center gap-3 text-xs font-semibold text-nks-red-dark shadow-nks-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{actionError || error}</span>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="bg-white border border-nks-gray-200 p-4.5 rounded-xl shadow-nks-sm flex items-center gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-nks-gray-400" />
          <input
            type="text"
            placeholder="Buscar arte por título ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-nks-gray-200 bg-nks-gray-100/50 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-nks-red/20 focus:border-nks-red placeholder:text-nks-gray-400 font-semibold text-nks-black transition-all"
          />
        </div>
      </div>

      {/* Grid of Artwork Cards */}
      {loading && dbArtworks.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-9 w-9 animate-spin text-nks-red" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {artworks.map((item) => (
              <div 
                key={item.id} 
                className="bg-white border border-nks-gray-200 rounded-xl overflow-hidden shadow-nks-sm flex flex-col group hover:shadow-nks transition-all duration-200"
              >
                {/* Preview Container */}
                <div className="relative aspect-[4/3] w-full bg-[#f6f5f3] flex items-center justify-center border-b border-nks-gray-100 shrink-0 overflow-hidden">
                  
                  {/* Status Tag Overlay */}
                  <div className="absolute top-3.5 left-3.5 z-10">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-display font-black tracking-wider border ${
                      item.status === 'PUBLISHED'
                        ? 'bg-[#E8F8F0] text-[#10B981] border-[#D1F2E1]'
                        : item.status === 'DRAFT'
                          ? 'bg-[#FEF6E9] text-[#F59E0B] border-[#FDEBD0]'
                          : 'bg-[#F2F2F2] text-[#777777] border-[#E5E5E5]'
                    }`}>
                      {item.status === 'PUBLISHED' ? 'ATIVO' : item.status === 'DRAFT' ? 'RASCUNHO' : 'INATIVO'}
                    </span>
                  </div>

                  {/* Image or Premium Minimalist Placeholder */}
                  {item.previewUrl ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={item.previewUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-nks-gray-400 h-full w-full bg-[#f5f5f5]">
                      <ImageIcon className="h-12 w-12 text-[#dcdcdc] stroke-[1.2]" />
                    </div>
                  )}
                </div>

                {/* Info and Actions */}
                <div className="p-4.5 flex flex-col flex-grow justify-between gap-4 bg-white">
                  <div>
                    <h3 className="font-sans font-bold text-nks-black text-xs.5 tracking-tight line-clamp-2 leading-snug min-h-[38px] group-hover:text-nks-red transition-colors">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-nks-gray-400 font-extrabold uppercase tracking-widest">
                        {item.category.name}
                      </span>
                      {item.isFree && (
                        <span className="inline-flex items-center gap-0.5 bg-nks-red text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-display tracking-wider">
                          <Sparkles className="h-2 w-2" /> Grátis
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row Buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    <Link href={`/admin/artes/${item.id}`} className="flex-grow">
                      <Button 
                        variant="ghost" 
                        className="w-full h-9 border border-nks-gray-200 bg-white text-nks-gray-700 hover:text-nks-black hover:bg-nks-gray-50 hover:border-nks-gray-300 text-xs font-bold gap-1.5 rounded-lg transition-all"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </Link>

                    <Button 
                      onClick={() => handleDelete(item.id)} 
                      variant="ghost" 
                      disabled={actionLoading}
                      className="h-9 w-9 p-0 flex items-center justify-center shrink-0 border border-nks-gray-200 bg-white text-nks-gray-400 hover:text-nks-red hover:bg-nks-red-subtle/10 hover:border-nks-red/20 rounded-lg transition-all cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {artworks.length === 0 && (
            <div className="bg-white border border-nks-gray-200 rounded-xl p-12 text-center text-nks-gray-400 font-semibold text-xs shadow-nks-sm">
              Nenhuma arte encontrada no catálogo.
            </div>
          )}
        </>
      )}
    </div>
  )
}

