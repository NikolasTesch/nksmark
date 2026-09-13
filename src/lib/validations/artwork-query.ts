import { z } from 'zod'
import type { ArtworkSort } from '@/types/artwork'

// Flag params (free/fav) are "1" when present. Anything else (incl. "0") is treated
// as absent so a single malformed param never bombs the whole parse.
const flag = z.preprocess((v) => (v === '1' ? '1' : undefined), z.enum(['1']).optional())

export const artworkQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  cat: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  free: flag,
  fav: flag,
  sort: z.enum(['recent', 'downloads', 'az', 'free']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  // Sem .min()/.max() aqui: o clamp para [1,60] acontece em código (CA-6),
  // inclusive para 0/negativos e valores inválidos (NaN cai no default 40).
  pageSize: z.coerce.number().int().default(40),
  ids: z.string().optional(),
})

export type ArtworkQueryInput = z.input<typeof artworkQuerySchema>

export interface ArtworkQuery {
  q?: string
  categoryId?: string
  tagId?: string
  isFree?: boolean
  onlyFavorites?: boolean
  sort: ArtworkSort
  page: number
  pageSize: number
  ids?: string[]
}

// Converte URLSearchParams (a fonte de verdade da loja) no objeto tipado.
// page/pageSize inválidos caem nos defaults; pageSize é clampado em [1,60].
export function parseArtworkQuery(sp: URLSearchParams): ArtworkQuery {
  const parsed = artworkQuerySchema.safeParse({
    q: sp.get('q') ?? undefined,
    cat: sp.get('cat') ?? undefined,
    tag: sp.get('tag') ?? undefined,
    free: sp.get('free') ?? undefined,
    fav: sp.get('fav') ?? undefined,
    sort: sp.get('sort') ?? undefined,
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    ids: sp.get('ids') ?? undefined,
  })

  const data = parsed.success ? parsed.data : artworkQuerySchema.parse({})
  const rawPageSize = Number.isFinite(data.pageSize) ? data.pageSize : 40
  const pageSize = Math.min(60, Math.max(1, rawPageSize))

  const ids = data.ids
    ? data.ids
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined

  return {
    q: data.q,
    categoryId: data.cat,
    tagId: data.tag,
    isFree: data.free === '1' ? true : undefined,
    onlyFavorites: data.fav === '1' ? true : undefined,
    sort: data.sort,
    page: data.page,
    pageSize,
    ids,
  }
}
