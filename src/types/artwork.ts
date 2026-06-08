import { Artwork, File as PrismaFile, Category, Tag, Download, User } from '@prisma/client'

export type ArtworkWithRelations = Artwork & {
  files: PrismaFile[]
  category: Category
  tags: Tag[]
  // Contagem agregada de downloads (vem do `_count` do Prisma) — usada para a
  // ordenação "mais baixadas" na loja. Opcional: nem toda query a inclui.
  _count?: { downloads: number }
}

export type DownloadWithRelations = Download & {
  user: User
  artwork: Artwork
}

export type ArtworkSort = 'recent' | 'downloads' | 'az' | 'free'

export interface ArtworkFilterState {
  categoryId?: string
  tagId?: string
  search?: string
  isFree?: boolean
  onlyFavorites?: boolean
  sort?: ArtworkSort
}
