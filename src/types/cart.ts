import { Cart, CartItem, Artwork } from '@prisma/client'

export type CartItemWithArtwork = CartItem & {
  artwork: Pick<Artwork, 'id' | 'title' | 'slug' | 'previewUrl' | 'priceCents'>
}

export type CartWithItems = Cart & {
  items: CartItemWithArtwork[]
}

export type CartResponse = {
  items: CartItemWithArtwork[]
  totalCents: number
  couponCode?: string
  discountCents?: number
  finalTotalCents?: number
}
