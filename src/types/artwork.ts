import { Artwork, File as PrismaFile, Category, Tag, Download, User } from '@prisma/client'

export type ArtworkWithRelations = Artwork & {
  files: PrismaFile[]
  category: Category
  tags: Tag[]
}

export type DownloadWithRelations = Download & {
  user: User
  artwork: Artwork
}

export interface ArtworkFilterState {
  categoryId?: string
  tagId?: string
  search?: string
  isFree?: boolean
}
