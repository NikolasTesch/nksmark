'use client'

import * as React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { LoadingGrid } from '@/components/shared/LoadingGrid'
import { ArtworkWithRelations } from '@/types/artwork'
import { Category, Tag, Status } from '@prisma/client'
import { useArtworkFilters } from '@/hooks/useArtworkFilters'
import { useArtworks } from '@/hooks/useArtworks'
import { useFavorites } from '@/hooks/useFavorites'
import { useSession } from 'next-auth/react'
import { Search, Sparkles, Lock, Heart, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

// Paginação: máximo de 10 linhas por página. Em telas grandes o grid tem 4 colunas,
// portanto 10 linhas = 40 cards por página. Os controles só aparecem acima desse limite.
const PAGE_SIZE = 40

export default function LojaPage() {
  const { filters, setCategory, setTag, setSearch, setIsFree, setOnlyFavorites, resetFilters } = useArtworkFilters()
  const { favoriteIds, favoritesCount } = useFavorites()
  const { data: session } = useSession()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [tags, setTags] = React.useState<Tag[]>([])

  // Buscamos todas as artes de uma vez para realizar a contagem e filtragem responsiva no client
  const { artworks: dbArtworks, loading } = useArtworks()

  React.useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCategories(res.data)
      })
      .catch((err) => console.error('Erro ao buscar categorias:', err))

    fetch('/api/tags')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setTags(res.data)
      })
      .catch((err) => console.error('Erro ao buscar tags:', err))
  }, [])

  const artworks = dbArtworks

  // Calcula a quantidade de artes por categoria com base na lista total
  const counts = React.useMemo(() => {
    const map: Record<string, number> = {}
    artworks.forEach((art) => {
      map[art.categoryId] = (map[art.categoryId] || 0) + 1
    })
    return map
  }, [artworks])

  const totalCount = artworks.length

  // Filtragem reativa do lado do cliente
  const favoriteSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds])
  const filteredArtworks = React.useMemo(() => {
    return artworks.filter((art) => {
      if (filters.categoryId && art.categoryId !== filters.categoryId) return false
      if (filters.tagId && !art.tags.some((t) => t.id === filters.tagId)) return false
      if (filters.isFree !== undefined && art.isFree !== filters.isFree) return false
      if (filters.onlyFavorites && !favoriteSet.has(art.id)) return false
      if (filters.search) {
        const query = filters.search.toLowerCase()
        const matchTitle = art.title.toLowerCase().includes(query)
        const matchDesc = art.description?.toLowerCase().includes(query) || false
        const matchTags = art.tags.some((t) => t.name.toLowerCase().includes(query))
        if (!matchTitle && !matchDesc && !matchTags) return false
      }
      return true
    })
  }, [artworks, filters, favoriteSet])

  // Estado de paginação (client-side)
  const [page, setPage] = React.useState(1)
  const totalPages = Math.max(1, Math.ceil(filteredArtworks.length / PAGE_SIZE))

  // Volta para a primeira página sempre que os filtros mudam
  React.useEffect(() => {
    setPage(1)
  }, [filters.categoryId, filters.tagId, filters.search, filters.isFree, filters.onlyFavorites])

  // Garante que a página atual nunca ultrapasse o total disponível
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pagedArtworks = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredArtworks.slice(start, start + PAGE_SIZE)
  }, [filteredArtworks, page])

  const userRole = (session?.user as { role?: string })?.role
  const canDownload = userRole === 'FASE' || userRole === 'ADMIN'

  const activeCategoryName = filters.categoryId
    ? (categories.find((c) => c.id === filters.categoryId)?.name || 'Categoria')
    : 'Todas as artes'

  return (
    <>
      <Header />

      {/* MiniHero editorial da loja */}
      <section className="bg-nks-black text-white border-b border-white/10">
        <div className="container mx-auto px-4 md:px-8 py-8 md:py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <span className="nks-eyebrow">Catálogo NKS Art</span>
            <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-none text-2xl md:text-3xl mt-2 mb-2 text-white">
              Artes prontas para sublimação
            </h1>
            <p className="text-[13px] md:text-[13.5px] text-white/60 leading-relaxed max-w-lg">
              Estampas, frases e vetores prontos. Baixe em <span className="font-mono text-white/80">CDR</span>,{' '}
              <span className="font-mono text-white/80">AI</span>,{' '}
              <span className="font-mono text-white/80">PDF</span> e{' '}
              <span className="font-mono text-white/80">OTF</span> — liberado para a equipe.
            </p>
          </div>

          {/* Stats em vermelho NKS */}
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-2xl md:text-3xl leading-none text-nks-red-light">
                {loading ? '...' : totalCount.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-white/50 mt-1">artes</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-2xl md:text-3xl leading-none text-nks-red-light">
                {loading ? '...' : categories.length}
              </span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-white/50 mt-1">categorias</span>
            </div>
          </div>
        </div>
      </section>

      {/* Layout Split Screen (Menu Lateral + Grid de Artes) */}
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-10 flex flex-col lg:flex-row gap-10 items-start">
        
        {/* Sidebar com busca, filtros e trilho de categorias */}
        <aside className="w-full lg:w-[230px] shrink-0 lg:sticky lg:top-20 flex flex-col gap-6">
          
          {/* Caixa de Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-nks-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar arte ou tag…"
              value={filters.search || ''}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 w-full rounded border border-nks-gray-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nks-red focus-visible:border-nks-red placeholder:text-nks-gray-400"
            />
          </div>

          {/* Trilho de Categorias */}
          <div className="flex flex-col gap-2.5">
            <span className="nks-eyebrow text-nks-gray-400">Categorias</span>
            <nav className="flex flex-col gap-0.5">
              {/* Opção "Tudo" */}
              <button
                onClick={() => setCategory(undefined)}
                className={`flex items-center py-2 px-3 pl-0 hover:bg-nks-gray-100 rounded transition-colors w-full cursor-pointer ${
                  !filters.categoryId ? 'font-semibold text-nks-black' : 'text-nks-gray-700'
                }`}
              >
                <span className={`w-[3px] h-[18px] rounded-sm mr-3 flex-none ${!filters.categoryId ? 'bg-nks-red' : 'bg-transparent'}`} />
                <span className="flex-grow text-left text-sm">Tudo</span>
                <span className={`font-mono text-[11px] ${!filters.categoryId ? 'text-nks-red' : 'text-nks-gray-400'}`}>
                  {totalCount}
                </span>
              </button>

              {/* Lista Dinâmica */}
              {categories.map((cat) => {
                const isActive = filters.categoryId === cat.id
                const catCount = counts[cat.id] || 0
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center py-2 px-3 pl-0 hover:bg-nks-gray-100 rounded transition-colors w-full cursor-pointer ${
                      isActive ? 'font-semibold text-nks-black' : 'text-nks-gray-700'
                    }`}
                  >
                    <span className={`w-[3px] h-[18px] rounded-sm mr-3 flex-none ${isActive ? 'bg-nks-red' : 'bg-transparent'}`} />
                    <span className="flex-grow text-left text-sm">{cat.name}</span>
                    <span className={`font-mono text-[11px] ${isActive ? 'text-nks-red' : 'text-nks-gray-400'}`}>
                      {catCount}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Divisor */}
          <div className="border-t border-nks-gray-200" />

          {/* Filtros rápidos: favoritas e gratuitas */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => setOnlyFavorites(filters.onlyFavorites ? undefined : true)}
              className={`flex items-center gap-2 py-2 px-3 text-sm font-semibold rounded border w-full justify-center transition-all cursor-pointer ${
                filters.onlyFavorites
                  ? 'bg-nks-red border-nks-red text-white'
                  : 'bg-white border-nks-gray-200 text-nks-gray-700 hover:bg-nks-gray-100'
              }`}
            >
              <Heart
                className="h-4 w-4"
                style={{ fill: filters.onlyFavorites ? 'currentColor' : 'transparent' }}
              />
              Favoritas
              {favoritesCount > 0 && (
                <span
                  className={`font-mono text-[11px] ${
                    filters.onlyFavorites ? 'text-white/80' : 'text-nks-gray-400'
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsFree(filters.isFree ? undefined : true)}
              className={`flex items-center gap-2 py-2 px-3 text-sm font-semibold rounded border w-full justify-center transition-all cursor-pointer ${
                filters.isFree
                  ? 'bg-nks-red border-nks-red text-white'
                  : 'bg-white border-nks-gray-200 text-nks-gray-700 hover:bg-nks-gray-100'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Só gratuitas
            </button>
          </div>

          {/* Tags Populares */}
          {tags.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <span className="nks-eyebrow text-nks-gray-400">Tags populares</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isActive = filters.tagId === tag.id
                  return (
                    <button
                      key={tag.id}
                      onClick={() => setTag(isActive ? undefined : tag.id)}
                      className={`font-mono text-xs px-2.5 py-1 rounded border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-nks-red border-nks-red text-white font-medium'
                          : 'bg-nks-gray-100 border-nks-gray-200 hover:bg-nks-gray-200 text-nks-gray-700'
                      }`}
                    >
                      #{tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ação de resetar todos os filtros */}
          {(filters.categoryId || filters.tagId || filters.search || filters.isFree !== undefined || filters.onlyFavorites) && (
            <button
              onClick={resetFilters}
              className="text-xs text-nks-red hover:underline font-semibold text-center w-full mt-2 cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          )}
        </aside>

        {/* Conteúdo Principal — Grid de Artes */}
        <main className="flex-grow min-w-0 w-full">
          
          {/* Linha de Status / Título */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-nks-gray-200 pb-3 mb-6">
            <div>
              <h2 className="font-display font-bold uppercase tracking-[-0.015em] text-lg md:text-xl text-nks-black">
                {activeCategoryName}
              </h2>
              <span className="text-[12px] text-nks-gray-400 font-semibold block mt-0.5">
                {filteredArtworks.length} {filteredArtworks.length === 1 ? 'arte' : 'artes'}
              </span>
            </div>
            
            {/* Aviso de Login Restrito */}
            {!canDownload && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-nks-red uppercase tracking-wider mb-0.5">
                <Lock className="h-3.5 w-3.5" /> Faça login para baixar
              </span>
            )}
          </div>

          {/* Grid de Cards de Alta Fidelidade (4 colunas em telas grandes) */}
          {loading ? (
            <LoadingGrid count={8} />
          ) : filteredArtworks.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[18px]">
                {pagedArtworks.map((art) => (
                  <ArtworkCard key={art.id} artwork={art} />
                ))}
              </div>

              {/* Controles de paginação — só aparecem com mais de 10 linhas (40 cards) */}
              {totalPages > 1 && (
                <nav
                  aria-label="Paginação"
                  className="flex items-center justify-center gap-1.5 mt-10"
                >
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded border border-nks-gray-200 bg-white text-sm font-semibold text-nks-gray-700 hover:bg-nks-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}
                      className={`h-9 min-w-[36px] px-2 rounded border text-sm font-semibold transition-colors cursor-pointer ${
                        p === page
                          ? 'bg-nks-red border-nks-red text-white'
                          : 'bg-white border-nks-gray-200 text-nks-gray-700 hover:bg-nks-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded border border-nks-gray-200 bg-white text-sm font-semibold text-nks-gray-700 hover:bg-nks-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Próxima <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-nks-gray-100 border border-nks-gray-200 rounded p-6">
              <span className="text-nks-gray-400 text-sm font-medium">
                Nenhuma arte localizada sob estes critérios de busca.
              </span>
              {(filters.categoryId || filters.tagId || filters.search || filters.isFree !== undefined || filters.onlyFavorites) && (
                <button
                  onClick={resetFilters}
                  className="text-nks-red hover:underline block mx-auto mt-2 text-xs font-semibold cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </>
  )
}
