import * as React from 'react'
import { ArtworkWithRelations } from '@/types/artwork'
import { ArtworkCard } from './ArtworkCard'
import { EmptyState } from '../shared/EmptyState'

interface ArtworkGridProps {
  artworks: ArtworkWithRelations[]
  onResetFilters?: () => void
}

export function ArtworkGrid({ artworks, onResetFilters }: ArtworkGridProps) {
  if (artworks.length === 0) {
    return <EmptyState onReset={onResetFilters} />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {artworks.map((art) => (
        <ArtworkCard key={art.id} artwork={art} />
      ))}
    </div>
  )
}
