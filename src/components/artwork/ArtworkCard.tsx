'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { ArtworkWithRelations } from '@/types/artwork'
import { Lock, Download, Heart, Image as ImageIcon } from 'lucide-react'

interface ArtworkCardProps {
  artwork: ArtworkWithRelations
}

// Card focado na imagem: a arte é o protagonista, a marca emoldura.
// Comportamento muda conforme o role — visitante vê cadeado, equipe baixa.
export function ArtworkCard({ artwork }: ArtworkCardProps) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role
  const canDownload = role === 'FASE' || role === 'ADMIN'

  const [fav, setFav] = React.useState(false)
  const href = `/loja/${artwork.slug}`
  const extraTag = artwork.tags[0]?.name

  return (
    <div className="group relative flex flex-col border border-nks-gray-200 rounded-lg bg-white overflow-hidden transition-shadow duration-[160ms] hover:shadow-[0_6px_20px_rgba(17,17,17,0.10)]">
      {/* Preview dominante (4:5) */}
      <Link href={href} className="relative block aspect-[4/5] w-full overflow-hidden bg-nks-gray-100">
        {artwork.previewUrl ? (
          <Image
            src={artwork.previewUrl}
            alt={artwork.title}
            fill
            className="object-cover transition-transform duration-[320ms] group-hover:scale-[1.05]"
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

        {/* Favoritar */}
        <button
          type="button"
          aria-label="Favoritar"
          onClick={(e) => {
            e.preventDefault()
            setFav((v) => !v)
          }}
          className="absolute top-[9px] right-[9px] flex h-7 w-7 items-center justify-center rounded-full bg-white/92 shadow-[0_1px_2px_rgba(17,17,17,0.06)]"
        >
          <Heart
            className="h-4 w-4"
            style={{ color: fav ? 'var(--color-nks-red)' : 'var(--color-nks-gray-400)', fill: fav ? 'var(--color-nks-red)' : 'transparent' }}
          />
        </button>
      </Link>

      {/* Info — título centralizado + categorias (não formatos) */}
      <Link href={href} className="px-2.5 pt-[9px] pb-2 text-center">
        <h3 className="mb-[3px] min-h-[31px] text-[12.5px] font-semibold leading-[1.25] text-nks-black">
          {artwork.title}
        </h3>
        <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-nks-gray-400">
          <span className="text-nks-red">{artwork.category.name}</span>
          {extraTag && extraTag.toLowerCase() !== artwork.category.name.toLowerCase() ? `, ${extraTag}` : null}
        </div>
      </Link>

      {/* Rodapé — ação por role */}
      <div className="border-t border-nks-gray-200 p-2 text-center">
        {canDownload ? (
          <Link
            href={href}
            className="inline-flex items-center gap-[5px] text-[11px] font-semibold text-nks-red hover:text-nks-red-dark"
          >
            <Download className="h-[15px] w-[15px]" /> Baixar arte
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
    </div>
  )
}
