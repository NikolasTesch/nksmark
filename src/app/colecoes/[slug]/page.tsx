'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ArtworkCard } from '@/components/artwork/ArtworkCard'
import { LoadingGrid } from '@/components/shared/LoadingGrid'
import { Button } from '@/components/ui/button'
import { ArtworkWithRelations } from '@/types/artwork'
import { ChevronRight, Loader2, SearchX, Sparkles } from 'lucide-react'

// Forma retornada por GET /api/public/collections?slug=...
// O endpoint público seleciona só os campos visíveis no card (id, title, slug,
// previewUrl, priceCents, isFree, category) para reduzir payload. O
// ArtworkCard espera ArtworkWithRelations (que inclui files/tags), então
// completamos com arrays vazios — em modo público o card mostra título,
// categoria e preço; formatos e tags extras não vêm por design.
type PublicCollection = {
  id: string
  title: string
  slug: string
  description: string | null
  artworks: ArtworkWithRelations[]
}

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>()

  const [collection, setCollection] = React.useState<PublicCollection | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  React.useEffect(() => {
    if (!slug) return
    let active = true
    setLoading(true)
    setNotFound(false)
    setCollection(null)
    fetch(`/api/public/collections?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((res) => {
        if (!active) return
        if (res?.success && res.data) {
          // Hidrata as artes para o formato esperado pelo ArtworkCard.
          // O endpoint público só retorna campos selecionados; preenchemos
          // files/tags como vazios para satisfazer o tipo sem inflar payload.
          const data = res.data as PublicCollection
          data.artworks = (data.artworks ?? []).map((a) => ({
            ...a,
            files: a.files ?? [],
            tags: a.tags ?? [],
          }))
          setCollection(data)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => {
        if (active) setNotFound(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug])

  // Loading state — espelha o padrão de loja/[slug]
  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin text-nks-gray-400" />
          <span className="text-sm text-nks-gray-700 font-semibold">
            Carregando coleção...
          </span>
        </main>
        <Footer />
      </>
    )
  }

  // 404 — coleção não encontrada
  if (notFound || !collection) {
    return (
      <>
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center py-24 gap-4 container mx-auto px-4 md:px-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white border border-nks-gray-200">
            <SearchX className="h-6 w-6 text-nks-gray-400" />
          </div>
          <span className="text-base text-nks-gray-700 font-semibold">
            Coleção não encontrada
          </span>
          <p className="text-sm text-nks-gray-400 max-w-sm text-center">
            O link desta coleção pode ter expirado ou sido removido. Confira a lista completa
            na loja.
          </p>
          <Link href="/loja">
            <Button className="rounded-xl">Voltar para o catálogo</Button>
          </Link>
        </main>
        <Footer />
      </>
    )
  }

  const hasArtworks = collection.artworks.length > 0

  return (
    <>
      <Header />
      <main className="flex-grow flex flex-col container mx-auto px-4 md:px-8 py-8 pb-16 animate-in fade-in duration-300 gap-8">
        {/* Breadcrumb: Loja › Coleções › {title} */}
        <nav
          aria-label="Navegação estrutural"
          className="flex items-center gap-1.5 text-xs font-semibold text-nks-gray-400 flex-wrap"
        >
          <Link href="/loja" className="hover:text-nks-red transition-colors">
            Loja
          </Link>
          <ChevronRight className="h-3 w-3 text-nks-gray-200" />
          <Link href="/loja" className="hover:text-nks-red transition-colors">
            Coleções
          </Link>
          <ChevronRight className="h-3 w-3 text-nks-gray-200" />
          <span className="text-nks-gray-700 truncate max-w-[180px] sm:max-w-xs">
            {collection.title}
          </span>
        </nav>

        {/* Header editorial — segue a identidade do MiniHero da loja */}
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-nks-black text-white border-b border-white/10 rounded-lg overflow-hidden"
        >
          <div className="px-5 md:px-8 py-7 md:py-9 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div className="min-w-0">
              <span className="nks-eyebrow text-white/60">Coleção</span>
              <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-none text-xl sm:text-2xl md:text-3xl mt-2 mb-2 text-white break-words">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-[12.5px] md:text-[13.5px] text-white/60 leading-relaxed max-w-2xl">
                  {collection.description}
                </p>
              )}
            </div>

            {/* Contador de artes — mesmo vermelho do MiniHero */}
            <div className="flex gap-6 sm:gap-8 shrink-0">
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-2xl md:text-3xl leading-none text-nks-red-light">
                  {hasArtworks ? collection.artworks.length : 0}
                </span>
                <span className="text-[10px] uppercase tracking-[0.1em] text-white/50 mt-1">
                  {collection.artworks.length === 1 ? 'arte' : 'artes'}
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Grid de Artes — mesma malha responsiva da loja */}
        <section>
          <div className="flex items-end justify-between gap-3 border-b border-nks-gray-200 pb-3 mb-5">
            <div>
              <h2 className="font-display font-bold uppercase tracking-[-0.015em] text-base md:text-xl text-nks-black leading-tight">
                Artes da coleção
              </h2>
              <span className="text-[12px] text-nks-gray-400 font-semibold block mt-0.5">
                {hasArtworks
                  ? `${collection.artworks.length} ${collection.artworks.length === 1 ? 'arte' : 'artes'} disponível${collection.artworks.length === 1 ? '' : 'is'}`
                  : 'Coleção vazia'}
              </span>
            </div>
          </div>

          {hasArtworks ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
              }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-[18px]"
            >
              {collection.artworks.map((art) => (
                <ArtworkCard key={art.id} artwork={art} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center text-center py-16 bg-nks-gray-100 border border-nks-gray-200 rounded px-6"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white border border-nks-gray-200 mb-4">
                <Sparkles className="h-6 w-6 text-nks-gray-400" />
              </div>
              <h3 className="font-display font-bold uppercase tracking-[-0.015em] text-base text-nks-black">
                Nenhuma arte nesta coleção
              </h3>
              <p className="text-sm text-nks-gray-400 font-medium mt-1 max-w-sm">
                Esta coleção ainda não tem artes publicadas. Volte em outro momento ou
                explore o catálogo completo.
              </p>
              <Link
                href="/loja"
                className="inline-flex items-center gap-1.5 h-9 px-4 mt-4 rounded bg-nks-red text-white text-xs font-semibold hover:bg-nks-red-dark transition-colors"
              >
                Ver catálogo completo
              </Link>
            </motion.div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
