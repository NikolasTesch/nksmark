import { Collection, CollectionArtwork, Artwork } from '@prisma/client'

export type CollectionWithArtworks = Collection & {
  artworks: (CollectionArtwork & {
    artwork: Pick<Artwork, 'id' | 'title' | 'slug' | 'previewUrl' | 'priceCents' | 'isFree' | 'createdAt'>
  })[]
}

export type PublicCollectionWithArtworks = {
  id: string
  title: string
  slug: string
  description: string | null
  artworkCount: number
  artworks: Pick<Artwork, 'id' | 'title' | 'slug' | 'previewUrl' | 'priceCents' | 'isFree' | 'createdAt'>[]
}
