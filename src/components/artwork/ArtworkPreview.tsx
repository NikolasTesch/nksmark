'use client'

import * as React from 'react'
import Image from 'next/image'
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ArtworkPreviewProps {
  url: string              // Main preview image URL
  title: string            // Title of the artwork
  images?: string[]        // Additional mockup/preview URLs
  formats?: string[]       // Available file formats, e.g. ['CDR', 'AI', 'PDF', 'OTF']
}

export function ArtworkPreview({ url, title, images = [], formats = [] }: ArtworkPreviewProps) {
  const [activeImageIndex, setActiveImageIndex] = React.useState(0)
  const [isZoomed, setIsZoomed] = React.useState(false)

  // Combine main url with other images, filtering duplicates
  const allImages = React.useMemo(() => {
    const list = [url, ...images].filter(Boolean)
    return Array.from(new Set(list))
  }, [url, images])

  const showGallery = allImages.length > 1

  const handlePrev = React.useCallback(() => {
    setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))
  }, [allImages.length])

  const handleNext = React.useCallback(() => {
    setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))
  }, [allImages.length])

  // Keyboard navigation for carousel and zoom
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        setIsZoomed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext])

  // Map formats to stylized brand labels and icons matching the mockup
  const formatBadges = React.useMemo(() => {
    const badgeConfigs = [
      {
        key: 'CDR',
        label: 'CORELDRAW ARQUIVO',
        iconColor: '#10B981', // emerald/green
      },
      {
        key: 'AI',
        label: 'ILLUSTRATOR ARQUIVO',
        iconColor: '#F59E0B', // amber/orange
      },
      {
        key: 'PDF',
        label: 'PDF ARQUIVO',
        iconColor: '#EF4444', // red
      },
      {
        key: 'OTF',
        label: 'FONTE ARQUIVO',
        iconColor: '#3B82F6', // blue
      },
    ]
    
    // Sort or filter based on actual available formats
    return badgeConfigs.filter(cfg => formats.includes(cfg.key))
  }, [formats])

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        
        {/* SIDEBAR: Thumbnails (Left side on desktop, bottom row on mobile) */}
        {showGallery && (
          <div className="col-span-1 md:col-span-2 flex flex-row md:flex-col gap-2.5 overflow-x-auto md:overflow-x-visible md:overflow-y-auto md:max-h-[480px] order-2 md:order-1 pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-nks-gray-200 scrollbar-track-transparent">
            {allImages.map((imgUrl, index) => (
              <button
                key={index}
                onClick={() => setActiveImageIndex(index)}
                className={`relative aspect-[4/3] w-[80px] sm:w-[100px] md:w-full rounded-lg overflow-hidden border cursor-pointer shrink-0 transition-all duration-200 ${
                  activeImageIndex === index
                    ? 'border-2 border-nks-black shadow-nks bg-white scale-[1.02]'
                    : 'border-nks-gray-200 bg-nks-gray-100 hover:border-nks-gray-400 hover:bg-white'
                }`}
              >
                <Image
                  src={imgUrl || '/placeholder.jpg'}
                  alt={`${title} - Miniatura ${index + 1}`}
                  fill
                  sizes="(max-w-768px) 100px, 150px"
                  className="object-contain p-1"
                />
              </button>
            ))}
          </div>
        )}

        {/* MAIN DISPLAY: Main Image, Zoom, Navigation, and Bottom Format Badges */}
        <div className={`order-1 md:order-2 ${showGallery ? 'col-span-1 md:col-span-10' : 'col-span-1 md:col-span-12'} relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-nks-gray-200 bg-white group shadow-nks-sm flex items-center justify-center`}>
          
          {/* Main Image */}
          <div className="relative w-full h-full p-6 flex items-center justify-center">
            <Image
              src={allImages[activeImageIndex] || '/placeholder.jpg'}
              alt={`${title} - Imagem ${activeImageIndex + 1}`}
              fill
              priority
              sizes="(max-w-1024px) 100vw, 900px"
              className="object-contain select-none transition-all duration-300 group-hover:scale-[1.01]"
            />
          </div>

          {/* Semi-transparent watermark background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
            <span className="text-4xl md:text-6xl font-black uppercase tracking-widest text-black rotate-45">
              NKS ART PREVIEW
            </span>
          </div>

          {/* NAVIGATION: Left & Right overlay arrows (Visible on hover) */}
          {showGallery && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-nks-black/80 hover:bg-nks-black text-white p-2.5 rounded-full shadow-nks hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 cursor-pointer border border-white/10"
                title="Imagem Anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-nks-black/80 hover:bg-nks-black text-white p-2.5 rounded-full shadow-nks hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 cursor-pointer border border-white/10"
                title="Próxima Imagem"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* ZOOM: Top Right Zoom Button */}
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-nks-black p-2.5 rounded-full shadow-nks hover:scale-105 active:scale-95 transition-all z-10 border border-nks-gray-200 cursor-pointer"
            title="Ampliar Imagem"
          >
            <Maximize2 className="h-4.5 w-4.5" />
          </button>

          {/* FORMATS BAR: Dark bottom bar showing available file types */}
          {formatBadges.length > 0 && (
            <div className="absolute bottom-0 inset-x-0 bg-nks-black/90 backdrop-blur-sm px-4 py-3 flex items-center justify-start gap-4 border-t border-white/10 overflow-x-auto scrollbar-none z-10">
              {formatBadges.map((badge) => (
                <div
                  key={badge.key}
                  className="flex items-center gap-2 bg-nks-gray-900 border border-white/10 px-3 py-1.5 rounded-md text-white font-mono text-[9px] font-black tracking-wider uppercase shrink-0"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 animate-pulse"
                    style={{ backgroundColor: badge.iconColor }}
                  />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX / ZOOM MODAL */}
      {isZoomed && (
        <div 
          className="fixed inset-0 bg-nks-black/95 backdrop-blur-md flex flex-col items-center justify-center z-[999] animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Lightbox Prev Button */}
          {showGallery && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Lightbox Next Button */}
          {showGallery && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Lightbox Image */}
          <div className="relative w-[90vw] h-[75vh]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={allImages[activeImageIndex] || '/placeholder.jpg'}
              alt={`${title} - Zoom`}
              fill
              sizes="90vw"
              className="object-contain select-none"
              priority
            />
          </div>

          {/* Lightbox Footer Caption */}
          <div className="mt-6 flex flex-col items-center text-center gap-1 px-4 select-none">
            <span className="text-white font-display font-black uppercase tracking-wider text-xl">{title}</span>
            <span className="text-nks-gray-400 text-xs font-bold font-mono tracking-wider">
              FOTO {activeImageIndex + 1} DE {allImages.length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
