import * as React from 'react'

interface LoadingGridProps {
  count?: number
}

// Skeleton fiel ao ArtworkCard: mesma grade da loja, preview 4:5, título e rodapé.
export function LoadingGrid({ count = 8 }: LoadingGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-[18px]">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded border border-nks-gray-200 bg-white"
        >
          {/* Preview (4:5) */}
          <div className="aspect-[4/5] w-full animate-pulse bg-nks-gray-100" />

          {/* Info: título + categoria + preço */}
          <div className="flex flex-col items-center gap-1.5 px-2.5 pt-[9px] pb-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-nks-gray-100" />
            <div className="h-2 w-1/3 animate-pulse rounded bg-nks-gray-100" />
            <div className="mt-0.5 h-3.5 w-12 animate-pulse rounded bg-nks-gray-100" />
          </div>

          {/* Rodapé (CTA) */}
          <div className="border-t border-nks-gray-200 p-2">
            <div className="mx-auto h-3 w-24 animate-pulse rounded bg-nks-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
