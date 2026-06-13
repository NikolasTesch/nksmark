'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { ArtworkSort } from '@/types/artwork'
import { Search, Sparkles, Lock, Heart, ChevronLeft, ChevronRight, SlidersHorizontal, X, ArrowUpDown, SearchX, ArrowUp } from 'lucide-react'

// Paginação: máximo de 10 linhas por página. Em telas grandes o grid tem 4 colunas,
// portanto 10 linhas = 40 cards por página. Os controles só aparecem acima desse limite.
const PAGE_SIZE = 40

// Opções de ordenação (rótulo amigável → valor do filtro).
const SORT_OPTIONS: { value: ArtworkSort; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'downloads', label: 'Mais baixadas' },
  { value: 'az', label: 'Nome (A–Z)' },
  { value: 'free', label: 'Gratuitas primeiro' },
]

// useArtworkFilters usa useSearchParams → precisa de um Suspense boundary acima.
export default function LojaPage() {
  return (
    <React.Suspense fallback={<LojaFallback />}>
      <LojaContent />
    </React.Suspense>
  )
}

function LojaFallback() {
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 md:px-8 py-10">
        <LoadingGrid count={8} />
      </div>
      <Footer />
    </>
  )
}

function LojaContent() {
  const { filters, setCategory, setTag, setSearch, setIsFree, setOnlyFavorites, setSort, resetFilters } = useArtworkFilters()
  const { favoriteIds, favoritesCount } = useFavorites()
  const { data: session } = useSession()
  const [categories, setCategories] = React.useState<Category[]>([])
  const [tags, setTags] = React.useState<Tag[]>([])
  const [purchasedArtworkIds, setPurchasedArtworkIds] = React.useState<Set<string>>(new Set())
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false)

  // Buscamos todas as artes de uma vez para realizar a contagem e filtragem responsiva no client
  const { artworks: dbArtworks, loading } = useArtworks()

  React.useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCategories((res.data as Category[]).filter((c) => c.showInFilter))
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

  // Ordenação client-side conforme a opção escolhida (aplicada após a filtragem).
  const sortedArtworks = React.useMemo(() => {
    const arr = [...filteredArtworks]
    switch (filters.sort) {
      case 'az':
        return arr.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
      case 'downloads':
        return arr.sort((a, b) => (b._count?.downloads ?? 0) - (a._count?.downloads ?? 0))
      case 'free':
        return arr.sort((a, b) => Number(b.isFree) - Number(a.isFree))
      case 'recent':
      default:
        return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  }, [filteredArtworks, filters.sort])

  // Estado de paginação (client-side)
  const [page, setPage] = React.useState(1)
  const totalPages = Math.max(1, Math.ceil(sortedArtworks.length / PAGE_SIZE))

  // Volta para a primeira página sempre que os filtros ou a ordenação mudam
  React.useEffect(() => {
    setPage(1)
  }, [filters.categoryId, filters.tagId, filters.search, filters.isFree, filters.onlyFavorites, filters.sort])

  // Garante que a página atual nunca ultrapasse o total disponível
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pagedArtworks = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return sortedArtworks.slice(start, start + PAGE_SIZE)
  }, [sortedArtworks, page])

  const userRole = (session?.user as { role?: string })?.role
  const canDownload = userRole === 'FASE' || userRole === 'ADMIN'

  React.useEffect(() => {
    if (userRole !== 'CLIENT') return
    fetch('/api/orders')
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return
        const ids = new Set<string>(
          (res.data as { status: string; artwork: { id: string } }[])
            .filter((o) => o.status === 'PAID')
            .map((o) => o.artwork.id)
        )
        setPurchasedArtworkIds(ids)
      })
      .catch(() => {})
  }, [userRole])

  const activeCategoryName = filters.categoryId
    ? (categories.find((c) => c.id === filters.categoryId)?.name || 'Categoria')
    : 'Todas as artes'

  // Contagem de filtros ativos (para badge no botão mobile)
  const activeFilterCount = [
    filters.categoryId,
    filters.tagId,
    filters.isFree,
    filters.onlyFavorites,
    filters.search,
  ].filter(Boolean).length

  const closeFilters = () => setIsFiltersOpen(false)

  // Botão "voltar ao topo" — aparece após rolar além de ~600px.
  const [showTopBtn, setShowTopBtn] = React.useState(false)
  React.useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const gridKey = `${filters.categoryId ?? ''}-${filters.tagId ?? ''}-${filters.search ?? ''}-${filters.isFree}-${filters.onlyFavorites}-${filters.sort ?? ''}-${page}`

  // Conteúdo do painel de filtros (reutilizado no desktop e no drawer mobile)
  const filterPanel = (
    <>
      {/* Trilho de Categorias */}
      <div className="flex flex-col gap-2.5">
        <span className="nks-eyebrow text-nks-gray-400">Categorias</span>
        <nav className="flex flex-col gap-0.5">
          <button
            onClick={() => { setCategory(undefined); closeFilters() }}
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

          {categories.map((cat) => {
            const isActive = filters.categoryId === cat.id
            const catCount = counts[cat.id] || 0
            return (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); closeFilters() }}
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

      {/* Limpar filtros */}
      {(filters.categoryId || filters.tagId || filters.search || filters.isFree !== undefined || filters.onlyFavorites) && (
        <button
          onClick={() => { resetFilters(); closeFilters() }}
          className="text-xs text-nks-red hover:underline font-semibold text-center w-full mt-2 cursor-pointer"
        >
          Limpar todos os filtros
        </button>
      )}
    </>
  )

  return (
    <>
      <Header />

      {/* MiniHero editorial da loja */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-nks-black text-white border-b border-white/10"
      >
        <div className="container mx-auto px-4 md:px-8 py-7 md:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <span className="nks-eyebrow">Catálogo NKS Art</span>
            <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-none text-xl sm:text-2xl md:text-3xl mt-2 mb-2 text-white">
              Artes prontas para sublimação
            </h1>
            <p className="text-[12.5px] md:text-[13.5px] text-white/60 leading-relaxed max-w-lg">
              Estampas, frases e vetores prontos. Baixe em <span className="font-mono text-white/80">CDR</span>,{' '}
              <span className="font-mono text-white/80">AI</span>,{' '}
              <span className="font-mono text-white/80">PDF</span> e{' '}
              <span className="font-mono text-white/80">OTF</span> — liberado para a equipe.
            </p>

            {/* Barra de busca por texto livre */}
            <div className="relative mt-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por título, descrição ou tag…"
                value={filters.search || ''}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 h-10 w-full rounded border border-white/20 bg-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-nks-red focus:bg-white/15 transition-colors"
              />
              {filters.search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Stats em vermelho NKS */}
          <div className="flex gap-6 sm:gap-8 shrink-0">
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
      </motion.section>

      {/* Mobile filter backdrop + drawer */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeFilters}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFiltersOpen && (
          <motion.aside
            key="drawer"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-[290px] bg-white p-5 flex flex-col gap-5 shadow-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-nks-gray-200">
              <span className="font-display font-bold text-sm uppercase tracking-wide text-nks-black">Filtros</span>
              <button
                onClick={closeFilters}
                className="text-nks-gray-400 hover:text-nks-black transition-colors p-1 rounded"
                aria-label="Fechar filtros"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterPanel}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Layout Split Screen (Menu Lateral + Grid de Artes) */}
      <div className="container mx-auto px-4 md:px-8 py-6 md:py-10 flex gap-10 items-start">

        {/* Desktop sidebar — oculto em mobile */}
        <motion.aside
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          className="hidden lg:flex w-[230px] shrink-0 sticky top-20 flex-col gap-6"
        >
          {filterPanel}
        </motion.aside>

        {/* Conteúdo Principal — Grid de Artes */}
        <main className="flex-grow min-w-0 w-full">

          {/* Linha de Status / Título */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
            className="flex items-end justify-between gap-3 border-b border-nks-gray-200 pb-3 mb-5"
          >
            <div>
              <h2 className="font-display font-bold uppercase tracking-[-0.015em] text-base md:text-xl text-nks-black leading-tight">
                {activeCategoryName}
              </h2>
              <span className="text-[12px] text-nks-gray-400 font-semibold block mt-0.5">
                {filteredArtworks.length} {filteredArtworks.length === 1 ? 'arte' : 'artes'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Ordenação */}
              <div className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-nks-gray-400" />
                <select
                  value={filters.sort ?? 'recent'}
                  onChange={(e) => setSort(e.target.value as ArtworkSort)}
                  aria-label="Ordenar artes"
                  className="h-9 cursor-pointer appearance-none rounded border border-nks-gray-200 bg-white pl-8 pr-7 text-xs font-semibold text-nks-gray-700 transition-colors hover:bg-nks-gray-100 focus:border-nks-red focus:outline-none"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-nks-gray-400" />
              </div>

              {/* Botão de filtros (mobile) */}
              <button
                onClick={() => setIsFiltersOpen(true)}
                className={`lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                  activeFilterCount > 0
                    ? 'bg-nks-red border-nks-red text-white'
                    : 'bg-white border-nks-gray-200 text-nks-gray-700 hover:bg-nks-gray-100'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 bg-white/25 text-white text-[10px] font-bold px-1 py-0.5 rounded">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Aviso de Login Restrito */}
              {!canDownload && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-nks-red uppercase tracking-wider">
                  <Lock className="h-3 w-3" />
                  <span className="hidden sm:inline">Faça login para baixar</span>
                  <span className="sm:hidden">Login</span>
                </span>
              )}
            </div>
          </motion.div>

          {/* Grid de Cards */}
          {loading ? (
            <LoadingGrid count={8} />
          ) : filteredArtworks.length > 0 ? (
            <>
              <motion.div
                key={gridKey}
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-[18px]"
              >
                {pagedArtworks.map((art) => (
                  <ArtworkCard key={art.id} artwork={art} purchasedArtworkIds={purchasedArtworkIds} />
                ))}
              </motion.div>

              {/* Controles de paginação */}
              {totalPages > 1 && (
                <motion.nav
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                  aria-label="Paginação"
                  className="flex items-center justify-center gap-1.5 mt-10 flex-wrap"
                >
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 h-9 px-2.5 sm:px-3 rounded border border-nks-gray-200 bg-white text-xs sm:text-sm font-semibold text-nks-gray-700 hover:bg-nks-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  {/* Números de página: simplificados no mobile */}
                  <div className="hidden sm:flex items-center gap-1.5">
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
                  </div>

                  {/* Indicador de página compacto no mobile */}
                  <span className="sm:hidden text-xs font-semibold text-nks-gray-700 px-3 py-2 bg-white border border-nks-gray-200 rounded">
                    {page} / {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 h-9 px-2.5 sm:px-3 rounded border border-nks-gray-200 bg-white text-xs sm:text-sm font-semibold text-nks-gray-700 hover:bg-nks-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.nav>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center text-center py-16 bg-nks-gray-100 border border-nks-gray-200 rounded px-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white border border-nks-gray-200 mb-4">
                <SearchX className="h-6 w-6 text-nks-gray-400" />
              </div>
              <h3 className="font-display font-bold uppercase tracking-[-0.015em] text-base text-nks-black">
                Nenhuma arte encontrada
              </h3>
              <p className="text-sm text-nks-gray-400 font-medium mt-1 max-w-sm">
                {filters.search
                  ? <>Não achamos nada para <span className="font-semibold text-nks-gray-700">“{filters.search}”</span>. Tente outro termo ou remova alguns filtros.</>
                  : 'Ajuste ou limpe os filtros para ver mais artes do catálogo.'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 h-9 px-4 mt-4 rounded bg-nks-red text-white text-xs font-semibold hover:bg-nks-red-dark transition-colors cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* Botão flutuante "voltar ao topo" */}
      <AnimatePresence>
        {showTopBtn && (
          <motion.button
            key="back-to-top"
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Voltar ao topo"
            className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-nks-black text-white shadow-nks-lg hover:bg-nks-gray-900 transition-colors cursor-pointer"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <Footer />
    </>
  )
}
