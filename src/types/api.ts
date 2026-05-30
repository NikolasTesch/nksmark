import { ArtworkWithRelations } from './artwork'
import { Category, Tag } from '@prisma/client'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type ArtworksResponse = ApiResponse<ArtworkWithRelations[]>
export type ArtworkDetailResponse = ApiResponse<ArtworkWithRelations>
export type CategoriesResponse = ApiResponse<Category[]>
export type TagsResponse = ApiResponse<Tag[]>
export type DownloadUrlResponse = ApiResponse<{ downloadUrl: string }>
export type SuggestionResponse = ApiResponse<{ id: string }>
