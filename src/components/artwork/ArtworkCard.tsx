'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { ArtworkWithRelations } from '@/types/artwork'
import { useFavorites } from '@/hooks/useFavorites'
import { Lock, Download, Heart, Image as ImageIcon, Eye, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatBRL } from '@/lib/utils/format'

interface ArtworkCardProps {
  artwork: ArtworkWithRelations
  purchasedArtworkIds?: Set<string>
}

// Card focado na imagem: a arte é o protagonista, a marca emoldura.
// Comportamento muda conforme o role — visitante vê cadeado, equipe baixa.
export function ArtworkCard({ artwork, purchasedArtworkIds }: ArtworkCardProps) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role
  const canDownload = role === 'FASE' || role === 'ADMIN'
  const isClient = role === 'CLIENT'
  const purchased = purchasedArtworkIds?.has(artwork.id) ?? false
  const canClientDownload = isClient && (artwork.isFree || purchased)
  const canBuy = isClient && !artwork.isFree && !purchased

  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(artwork.id)
  const href = `/loja/${artwork.slug}`
  const extraTag = artwork.tags[0]?.name

  // Formatos únicos disponíveis (CDR, AI, …) exibidos no overlay de hover.
  const formats = React.useMemo(
    () => Array.from(new Set(artwork.files.map((f) => f.format))),
    [artwork.files]
  )

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } },
      }}
      whileHover={{ y: -5, transition: { type: 'tween', duration: 0.15, ease: 'easeOut' } }}
      className="group relative flex flex-col border border-nks-gray-200 rounded bg-white overflow-hidden transition-all duration-[160ms] hover:shadow-nks-md hover:border-nks-gray-400"
    >
      {/* Preview dominante (4:5) */}
      <Link href={href} className="relative block aspect-[4/5] w-full overflow-hidden bg-nks-gray-100">
        {artwork.previewUrl ? (
          <Image
            src={artwork.previewUrl}
            alt={artwork.title}
            fill
            className="object-cover transition-transform duration-[320ms] group-hover:scale-[1.04]"
            sizes="(max-width: 980px) 50vw, 320px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-12 w-12 text-nks-gray-400 opacity-60" />
          </div>
        )}

        {/* Cadeado — conteúdo bloqueado a visitantes */}
        {!canDownload && (
          <div className="absolute top-[9px] left-[9px] flex h-[26px] w-[26px] items-center justify-center rounded-full bg-black/60 text-white">
            <Lock className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Badge grátis */}
        {artwork.isFree && (
          <span className="absolute bottom-[9px] left-[9px] inline-flex items-center bg-nks-red text-white rounded-sm px-[9px] py-1 text-[11px] font-medium uppercase tracking-[0.05em]">
            Grátis
          </span>
        )}

        {/* Favoritar com Pop Animation */}
        <button
          type="button"
          aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'}
          aria-pressed={fav}
          onClick={(e) => {
            e.preventDefault()
            toggleFavorite(artwork.id)
          }}
          className="absolute top-[9px] right-[9px] z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/92 shadow-[0_1px_2px_rgba(17,17,17,0.06)] cursor-pointer"
        >
          <motion.div
            whileTap={{ scale: 0.8 }}
            animate={fav ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <Heart
              className="h-4 w-4 transition-colors"
              style={{
                color: fav ? 'var(--color-nks-red)' : 'var(--color-nks-gray-400)',
                fill: fav ? 'var(--color-nks-red)' : 'transparent'
              }}
            />
          </motion.div>
        </button>

        {/* Overlay de hover — escurece a imagem e revela CTA + formatos disponíveis */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/65 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div />
          <div className="flex translate-y-1.5 flex-col items-center gap-2 p-2.5 transition-transform duration-200 group-hover:translate-y-0">
            <span className="inline-flex items-center gap-1.5 rounded bg-white px-3 py-1.5 text-[11px] font-bold text-nks-black shadow-nks">
              <Eye className="h-3.5 w-3.5" /> Ver arte
            </span>
            {formats.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1">
                {formats.map((f) => (
                  <span
                    key={f}
                    className="rounded-sm bg-white/90 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-[0.04em] text-nks-black"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Info — título centralizado + categoria + preço */}
      <Link href={href} className="px-2.5 pt-[9px] pb-2 text-center">
        <h3 className="mb-[3px] min-h-[31px] text-[12.5px] font-semibold leading-[1.25] text-nks-black">
          {artwork.title}
        </h3>
        <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-nks-gray-400">
          <span className="text-nks-red">{artwork.category.name}</span>
          {extraTag && extraTag.toLowerCase() !== artwork.category.name.toLowerCase() ? `, ${extraTag}` : null}
        </div>
        <div className="mt-1.5 text-sm font-bold">
          {artwork.isFree ? (
            <span className="text-nks-red">Grátis</span>
          ) : (
            <span className="text-nks-black">{formatBRL(artwork.priceCents)}</span>
          )}
        </div>
      </Link>

      {/* Rodapé — ação por role */}
      <div className="border-t border-nks-gray-200 p-2 text-center">
        {canDownload || canClientDownload ? (
          <Link
            href={href}
            className="inline-flex items-center gap-[5px] text-[11px] font-semibold text-nks-red hover:text-nks-red-dark"
          >
            <Download className="h-[15px] w-[15px]" /> Baixar arte
          </Link>
        ) : canBuy ? (
          <Link
            href={href}
            className="inline-flex items-center gap-[5px] text-[11px] font-semibold text-nks-black hover:text-nks-gray-700"
          >
            <ShoppingCart className="h-[15px] w-[15px]" /> Comprar por {formatBRL(artwork.priceCents)}
          </Link>
        ) : (
          <Link
            href={href}
            className="inline-flex items-center gap-[5px] text-[11px] font-medium text-nks-gray-400"
          >
            <Lock className="h-3.5 w-3.5" /> Faça login para baixar
          </Link>
        )}
      </div>
    </motion.div>
  )
}
