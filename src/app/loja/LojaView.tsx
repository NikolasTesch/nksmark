'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { ArtworkWithRelations } from '@/types/artwork'
import { Category, Tag } from '@prisma/client'
import { useArtworkFilters } from '@/hooks/useArtworkFilters'
import { useFavorites } from '@/hooks/useFavorites'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { ArtworkSort } from '@/types/artwork'
import { Search, Sparkles, Lock, Heart, ChevronLeft, ChevronRight, SlidersHorizontal, X, ArrowUpDown, ArrowUp } from 'lucide-react'
import { logger as log } from "@/lib/utils/logger";

const SORT_OPTIONS: { value: ArtworkSort; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'downloads', label: 'Mais baixadas' },
  { value: 'az', label: 'Nome (A–Z)' },
  { value: 'free', label: 'Gratuitas primeiro' },
]

interface LojaViewProps {
  items: ArtworkWithRelations[]
  total: number
  page: number
  pageSize: number
  categories: Category[]
  tags: Tag[]
  categoryCounts: Record<string, number>
}

export function LojaView({ items, total, page, pageSize, categories, tags, categoryCounts }: LojaViewProps) {
  const { filters, page: urlPage, searchInput, setCategory, setTag, setSearch, setIsFree, setOnlyFavorites, setSort, setPage, resetFilters } = useArtworkFilters()
  const { favoriteIds, favoritesCount } = useFavorites()
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [purchasedArtworkIds, setPurchasedArtworkIds] = React.useState<Set<string>>(new Set())
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false)

  // Overlay de favoritos (RF-4 / requisito 4): quando fav=1, replica os ids do
  // localStorage na URL `ids` para o servidor filtrar. Revalida na mutação (CA-4)
  // pois router.replace re-renderiza o Server Component com os novos ids.
  const favActive = filters.onlyFavorites === true
  React.useEffect(() => {
    if (!favActive) return
    const desired = favoriteIds.slice(0, 200).join(',')
    const current = new URLSearchParams(window.location.search).get('ids') ?? ''
    if (current !== desired) {
      const params = new URLSearchParams(window.location.search)
      if (desired) params.set('ids', desired)
      else params.delete('ids')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favActive, favoriteIds])

  const totalCount = React.useMemo(
    () => Object.values(categoryCounts).reduce((a, b) => a + b, 0),
    [categoryCounts]
  )

  const counts = categoryCounts

  const userRole = (session?.user as { role?: string })?.role
  const canDownload = userRole === 'FASE' || userRole === 'ADMIN'

  React.useEffect(() => {
    if (userRole !== 'CLIENT') return
    fetch('/api/orders')
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return
        type OrderData = { status: string; artwork: { id: string } | null; items: { artwork: { id: string } }[] }
        const paidOrders = (res.data as OrderData[]).filter((o) => o.status === 'PAID')
        const ids = new Set<string>()
        for (const o of paidOrders) {
          if (o.artwork?.id) ids.add(o.artwork.id)
          for (const item of o.items || []) {
            if (item.artwork?.id) ids.add(item.artwork.id)
          }
        }
        setPurchasedArtworkIds(ids)
      })
      .catch(() => {})
  }, [userRole])

  const activeCategoryName = filters.categoryId
    ? (categories.find((c) => c.id === filters.categoryId)?.name || 'Categoria')
    : 'Todas as artes'

  const activeFilterCount = [
    filters.categoryId,
    filters.tagId,
    filters.isFree,
    filters.onlyFavorites,
    filters.search,
  ].filter(Boolean).length

  const closeFilters = () => setIsFiltersOpen(false)

  const [showTopBtn, setShowTopBtn] = React.useState(false)
  React.useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(urlPage, totalPages)

  const gridKey = `${filters.categoryId ?? ''}-${filters.tagId ?? ''}-${filters.search ?? ''}-${filters.isFree}-${filters.onlyFavorites}-${filters.sort ?? ''}-${currentPage}`

  // Chips de filtros ativos removíveis (T-8).
  const chips: { key: string; label: string; onRemove: () => void; ariaLabel: string }[] = []
  if (filters.search)
    chips.push({ key: 'q', label: `Busca: “${filters.search}”`, onRemove: () => setSearch(''), ariaLabel: 'Remover busca' })
  if (filters.categoryId) {
    const name = categories.find((c) => c.id === filters.categoryId)?.name || 'Categoria'
    chips.push({ key: 'cat', label: name, onRemove: () => setCategory(undefined), ariaLabel: 'Remover categoria' })
  }
  if (filters.tagId) {
    const name = tags.find((t) => t.id === filters.tagId)?.name || 'Tag'
    chips.push({ key: 'tag', label: `#${name}`, onRemove: () => setTag(undefined), ariaLabel: 'Remover tag' })
  }
  if (filters.isFree)
    chips.push({ key: 'free', label: 'Grátis', onRemove: () => setIsFree(undefined), ariaLabel: 'Remover filtro grátis' })
  if (filters.onlyFavorites)
    chips.push({ key: 'fav', label: 'Favoritas', onRemove: () => setOnlyFavorites(undefined), ariaLabel: 'Remover filtro favoritas' })

  const filterPanel = (
    <>
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

      <div className="border-t border-nks-gray-200" />

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
            <span className={`font-mono text-[11px] ${filters.onlyFavorites ? 'text-white/80' : 'text-nks-gray-400'}`}>
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

            <div className="relative mt-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Busca inteligente — título, descrição ou tag…"
                value={searchInput}
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

          <div className="flex gap-6 sm:gap-8 shrink-0">
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-2xl md:text-3xl leading-none text-nks-red-light">
                {totalCount.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-white/50 mt-1">artes</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-2xl md:text-3xl leading-none text-nks-red-light">
                {categories.length}
              </span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-white/50 mt-1">categorias</span>
            </div>
          </div>
        </div>
      </motion.section>

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

      <div className="container mx-auto px-4 md:px-8 py-6 md:py-10 flex gap-10 items-start">
        <motion.aside
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          className="hidden lg:flex w-[230px] shrink-0 sticky top-20 flex-col gap-6"
        >
          {filterPanel}
        </motion.aside>

        <main className="flex-grow min-w-0 w-full">
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
                {total} {total === 1 ? 'arte' : 'artes'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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

              {!canDownload && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-nks-red uppercase tracking-wider">
                  <Lock className="h-3 w-3" />
                  <span className="hidden sm:inline">Faça login para baixar</span>
                  <span className="sm:hidden">Login</span>
                </span>
              )}
            </div>
          </motion.div>

          {/* Chips de filtros ativos (T-8) */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.onRemove}
                  aria-label={chip.ariaLabel}
                  className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-full bg-nks-gray-100 border border-nks-gray-200 text-xs font-semibold text-nks-gray-700 hover:bg-nks-gray-200 transition-colors cursor-pointer"
                >
                  {chip.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                onClick={resetFilters}
                className="text-xs text-nks-red hover:underline font-semibold cursor-pointer"
              >
                Limpar tudo
              </button>
            </div>
          )}

          {items.length > 0 ? (
            <>
              <motion.div
                key={gridKey}
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } }}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-[18px]"
              >
                {items.map((art) => (
                  <ArtworkCard key={art.id} artwork={art} purchasedArtworkIds={purchasedArtworkIds} />
                ))}
              </motion.div>

              {totalPages > 1 && (
                <motion.nav
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                  aria-label="Paginação"
                  className="flex items-center justify-center gap-1.5 mt-10 flex-wrap"
                >
                  <button
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 h-9 px-2.5 sm:px-3 rounded border border-nks-gray-200 bg-white text-xs sm:text-sm font-semibold text-nks-gray-700 hover:bg-nks-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        aria-current={p === currentPage ? 'page' : undefined}
                        className={`h-9 min-w-[36px] px-2 rounded border text-sm font-semibold transition-colors cursor-pointer ${
                          p === currentPage
                            ? 'bg-nks-red border-nks-red text-white'
                            : 'bg-white border-nks-gray-200 text-nks-gray-700 hover:bg-nks-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <span className="sm:hidden text-xs font-semibold text-nks-gray-700 px-3 py-2 bg-white border border-nks-gray-200 rounded">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 h-9 px-2.5 sm:px-3 rounded border border-nks-gray-200 bg-white text-xs sm:text-sm font-semibold text-nks-gray-700 hover:bg-nks-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.nav>
              )}
            </>
          ) : (
            <EmptyState
              title={favActive && favoriteIds.length === 0 ? 'Nenhuma favorita ainda' : 'Nenhuma arte encontrada'}
              description={
                favActive && favoriteIds.length === 0
                  ? 'Você ainda não favoritou nenhuma arte. Toque no coração dos cards para vê-las aqui.'
                  : filters.search
                    ? `Não achamos nada para “${filters.search}”. Tente outro termo ou remova alguns filtros.`
                    : 'Ajuste ou limpe os filtros para ver mais artes do catálogo.'
              }
              onReset={activeFilterCount > 0 ? resetFilters : undefined}
            />
          )}
        </main>
      </div>

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
    </>
  )
}
