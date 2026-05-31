'use client'

import * as React from 'react'
import Image from 'next/image'
import { ZoomIn, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ArtworkPreviewProps {
  images: string[]
  title: string
  formats: string[]
}

// Rótulos amigáveis para os formatos de arquivo exibidos na barra inferior.
const FORMAT_LABELS: Record<string, string> = {
  CDR: 'CorelDRAW',
  AI: 'Illustrator',
  PDF: 'PDF',
  OTF: 'Fonte',
  PNG: 'PNG',
  JPG: 'JPG',
}

export function ArtworkPreview({ images, title, formats }: ArtworkPreviewProps) {
  const gallery = images.filter(Boolean)
  const safeGallery = gallery.length > 0 ? gallery : ['/placeholder.jpg']

  const [activeIndex, setActiveIndex] = React.useState(0)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  const total = safeGallery.length
  const hasMultiple = total > 1

  const goTo = React.useCallback(
    (index: number) => {
      setActiveIndex((index + total) % total)
    },
    [total]
  )

  const next = React.useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex])
  const prev = React.useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex])

  // Navegação por teclado quando o lightbox está aberto.
  React.useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, next, prev])

  const touchStartX = React.useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultiple) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) {
      delta > 0 ? next() : prev()
    }
    touchStartX.current = null
  }

  const uniqueFormats = Array.from(new Set(formats.map((f) => f.toUpperCase())))
  const activeImage = safeGallery[activeIndex]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {/* Sidebar de thumbnails */}
        {hasMultiple && (
          <div className="flex flex-col gap-2.5 max-h-[520px] overflow-y-auto pr-0.5 shrink-0">
            {safeGallery.map((img, idx) => (
              <button
                key={img + idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Visualizar imagem ${idx + 1}`}
                aria-current={idx === activeIndex}
                className={`relative h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-lg overflow-hidden border bg-nks-gray-100 shrink-0 transition-all duration-200 cursor-pointer ${
                  idx === activeIndex
                    ? 'border-nks-red ring-2 ring-nks-red/20'
                    : 'border-nks-gray-200 hover:border-nks-gray-400 opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={img} alt={`${title} — miniatura ${idx + 1}`} fill className="object-cover" sizes="72px" />
              </button>
            ))}
          </div>
        )}

        {/* Imagem principal */}
        <div
          className="relative flex-grow aspect-[4/3] rounded-2xl overflow-hidden border border-nks-gray-200 bg-nks-gray-100 group shadow-nks-sm"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={activeImage}
            alt={title}
            fill
            className="object-contain transition-all duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 800px"
            priority
          />

          {/* Marca d'água sutil de preview */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <span className="text-4xl md:text-6xl font-black uppercase tracking-widest text-black rotate-45">
              NKS ART PREVIEW
            </span>
          </div>

          {/* Botão de zoom */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute top-4 right-4 bg-white/85 backdrop-blur-sm hover:bg-white p-2.5 rounded-full shadow-nks-sm text-nks-gray-750 border border-nks-gray-200 transition-all hover:scale-105 active:scale-95 z-10 cursor-pointer"
            title="Ampliar imagem"
            aria-label="Ampliar imagem"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>

          {/* Setas de navegação */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/85 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-nks-sm text-nks-gray-750 border border-nks-gray-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 z-10 cursor-pointer"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/85 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-nks-sm text-nks-gray-750 border border-nks-gray-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 z-10 cursor-pointer"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Indicador de posição */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-nks-black/70 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full z-10">
                {activeIndex + 1} / {total}
              </div>
            </>
          )}

          {/* Barra inferior com formatos disponíveis */}
          {uniqueFormats.length > 0 && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-nks-black/85 to-transparent pt-8 pb-3 px-4 flex flex-wrap items-center gap-1.5 z-[5] pointer-events-none">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60 mr-1">
                Inclui:
              </span>
              {uniqueFormats.map((fmt) => (
                <span
                  key={fmt}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide text-white bg-white/15 border border-white/20 backdrop-blur-sm"
                >
                  {FORMAT_LABELS[fmt] || fmt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Zoom modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-nks-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer z-10"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative w-full h-full max-w-6xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage}
              alt={title}
              fill
              className="object-contain select-none"
              sizes="100vw"
            />

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-2 sm:-left-14 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-2 sm:-right-14 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {hasMultiple && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-xs font-bold tracking-wider">
              {activeIndex + 1} / {total}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
