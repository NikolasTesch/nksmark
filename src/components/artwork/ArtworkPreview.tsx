'use client'

import * as React from 'react'
import Image from 'next/image'
import { Maximize2, Minimize2 } from 'lucide-react'

interface ArtworkPreviewProps {
  url: string
  title: string
}

export function ArtworkPreview({ url, title }: ArtworkPreviewProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 group shadow-sm">
      <Image
        src={url || '/placeholder.jpg'}
        alt={title}
        fill
        className={`object-contain transition-all duration-300 ${
          isExpanded ? 'scale-110' : 'scale-100 group-hover:scale-[1.02]'
        }`}
        sizes="(max-w-1024px) 100vw, 800px"
        priority
      />
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-900 p-2.5 rounded-full shadow-sm text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800 transition-all hover:scale-105 active:scale-95 z-10"
        title={isExpanded ? 'Reduzir visualização' : 'Ampliar visualização'}
      >
        {isExpanded ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
      </button>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
        <span className="text-4xl md:text-6xl font-black uppercase tracking-widest text-black dark:text-white rotate-45">
          NKS ART PREVIEW
        </span>
      </div>
    </div>
  )
}
