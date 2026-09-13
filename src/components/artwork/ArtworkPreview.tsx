'use client'

import * as React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react'

const PLACEHOLDER = '/placeholder.svg'
const SWIPE_THRESHOLD = 40
const MIN_SCALE = 1
const MAX_SCALE = 4

interface ArtworkPreviewProps {
  url: string
  title: string
  images?: string[]
  formats?: string[]
}

function touchDistance(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

export function ArtworkPreview({ url, title, images = [], formats = [] }: ArtworkPreviewProps) {
  const [activeImageIndex, setActiveImageIndex] = React.useState(0)
  const [isZoomed, setIsZoomed] = React.useState(false)
  const [failedSrcs, setFailedSrcs] = React.useState<Set<string>>(new Set())
  const [scale, setScale] = React.useState(1)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })

  const overlayRef = React.useRef<HTMLDivElement>(null)
  const scaleRef = React.useRef(1)
  const panRef = React.useRef({ x: 0, y: 0 })
  const gesture = React.useRef({
    mode: 'none' as 'none' | 'pinch' | 'pan' | 'swipe',
    startDist: 0,
    startScale: 1,
    startPanX: 0,
    startPanY: 0,
    startX: 0,
  })

  const allImages = React.useMemo(() => {
    const list = [url, ...images].filter(Boolean)
    return Array.from(new Set(list))
  }, [url, images])

  const showGallery = allImages.length > 1

  const srcFor = React.useCallback(
    (src: string | undefined) => {
      if (!src || failedSrcs.has(src)) return PLACEHOLDER
      return src
    },
    [failedSrcs],
  )

  const markFailed = (src: string | undefined) => {
    if (!src || src === PLACEHOLDER) return
    setFailedSrcs((prev) => new Set(prev).add(src))
  }

  const handlePrev = React.useCallback(() => {
    setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))
  }, [allImages.length])

  const handleNext = React.useCallback(() => {
    setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))
  }, [allImages.length])

  const resetZoom = React.useCallback(() => {
    scaleRef.current = 1
    panRef.current = { x: 0, y: 0 }
    setScale(1)
    setPan({ x: 0, y: 0 })
    gesture.current.mode = 'none'
  }, [])

  const closeZoom = React.useCallback(() => {
    setIsZoomed(false)
    resetZoom()
  }, [resetZoom])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        closeZoom()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext, closeZoom])

  React.useEffect(() => {
    resetZoom()
  }, [activeImageIndex, resetZoom])

  // Pinch / pan / swipe no overlay fullscreen — listener nativo p/ preventDefault (scroll).
  React.useEffect(() => {
    if (!isZoomed) return
    const el = overlayRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        gesture.current.mode = 'pinch'
        gesture.current.startDist = touchDistance(e.touches[0], e.touches[1])
        gesture.current.startScale = scaleRef.current
        return
      }
      if (scaleRef.current > 1) {
        gesture.current.mode = 'pan'
        gesture.current.startX = e.touches[0].clientX
        gesture.current.startPanX = panRef.current.x
        gesture.current.startPanY = panRef.current.y
        gesture.current.startDist = e.touches[0].clientY
        return
      }
      gesture.current.mode = 'swipe'
      gesture.current.startX = e.touches[0].clientX
    }

    const onMove = (e: TouchEvent) => {
      const g = gesture.current
      if (g.mode === 'pinch' && e.touches.length >= 2) {
        e.preventDefault()
        const dist = touchDistance(e.touches[0], e.touches[1])
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, g.startScale * (dist / (g.startDist || 1))))
        scaleRef.current = next
        setScale(next)
        if (next === 1) {
          panRef.current = { x: 0, y: 0 }
          setPan({ x: 0, y: 0 })
        }
        return
      }
      if (g.mode === 'pan' && e.touches.length === 1 && scaleRef.current > 1) {
        e.preventDefault()
        const dx = e.touches[0].clientX - g.startX
        const dy = e.touches[0].clientY - g.startDist
        const next = { x: g.startPanX + dx, y: g.startPanY + dy }
        panRef.current = next
        setPan(next)
      }
    }

    const onEnd = (e: TouchEvent) => {
      const g = gesture.current
      if (g.mode === 'swipe' && e.changedTouches[0] && scaleRef.current === 1) {
        const dx = e.changedTouches[0].clientX - g.startX
        if (dx > SWIPE_THRESHOLD) handlePrev()
        else if (dx < -SWIPE_THRESHOLD) handleNext()
      }
      if (e.touches.length === 0) g.mode = 'none'
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [isZoomed, handlePrev, handleNext])

  const formatBadges = React.useMemo(() => {
    const badgeConfigs = [
      { key: 'CDR', label: 'CORELDRAW ARQUIVO', iconColor: '#10B981' },
      { key: 'AI', label: 'ILLUSTRATOR ARQUIVO', iconColor: '#F59E0B' },
      { key: 'PDF', label: 'PDF ARQUIVO', iconColor: '#EF4444' },
      { key: 'OTF', label: 'FONTE ARQUIVO', iconColor: '#3B82F6' },
    ]
    return badgeConfigs.filter((cfg) => formats.includes(cfg.key))
  }, [formats])

  const activeSrc = allImages[activeImageIndex]

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
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
                  src={srcFor(imgUrl)}
                  alt={`${title} - Miniatura ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100px, 150px"
                  className="object-contain p-1"
                  onError={() => markFailed(imgUrl)}
                />
              </button>
            ))}
          </div>
        )}

        <div className={`order-1 md:order-2 ${showGallery ? 'col-span-1 md:col-span-10' : 'col-span-1 md:col-span-12'} relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-nks-gray-200 bg-white group shadow-nks-sm flex items-center justify-center`}>
          <motion.div
            className="relative w-full h-full p-6 flex items-center justify-center"
            drag={showGallery ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            dragDirectionLock
            onDragEnd={(_, info) => {
              if (info.offset.x > SWIPE_THRESHOLD) handlePrev()
              else if (info.offset.x < -SWIPE_THRESHOLD) handleNext()
            }}
            style={{ touchAction: 'pan-y' }}
          >
            <Image
              src={srcFor(activeSrc)}
              alt={`${title} - Imagem ${activeImageIndex + 1}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-contain select-none pointer-events-none transition-all duration-300 group-hover:scale-[1.01]"
              onError={() => markFailed(activeSrc)}
            />
          </motion.div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
            <span className="text-4xl md:text-6xl font-black uppercase tracking-widest text-black rotate-45">
              NKS ART PREVIEW
            </span>
          </div>

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

          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-nks-black p-2.5 rounded-full shadow-nks hover:scale-105 active:scale-95 transition-all z-10 border border-nks-gray-200 cursor-pointer"
            title="Ampliar Imagem"
          >
            <Maximize2 className="h-4.5 w-4.5" />
          </button>

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

      {isZoomed && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-nks-black/95 backdrop-blur-md flex flex-col items-center justify-center z-[999] animate-in fade-in duration-200"
          style={{ touchAction: 'none' }}
          onClick={closeZoom}
        >
          <button
            onClick={closeZoom}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10 z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {showGallery && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10 z-10"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {showGallery && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10 z-10"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div
            className="relative w-[90vw] h-[75vh]"
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'none' }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              <Image
                src={srcFor(activeSrc)}
                alt={`${title} - Zoom`}
                fill
                sizes="90vw"
                className="object-contain select-none"
                priority
                onError={() => markFailed(activeSrc)}
              />
            </div>
          </div>

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
