import prisma from '@/lib/prisma'
import { Prisma, Status, Format } from '@prisma/client'
import type { ArtworkQuery } from '@/lib/validations/artwork-query'
import type { ArtworkWithRelations } from '@/types/artwork'

export interface ArtworkPageResult {
  items: ArtworkWithRelations[]
  total: number
  page: number
  pageSize: number
}

// Ordenação idêntica à semântica client-side atual (RF-6 / requisito 5):
// recent=createdAt desc, downloads=_count desc, az=title asc, free=isFree desc.
const PRISMA_ORDER: Record<ArtworkQuery['sort'], Prisma.ArtworkOrderByWithRelationInput> = {
  recent: { createdAt: 'desc' },
  downloads: { downloads: { _count: 'desc' } },
  az: { title: 'asc' },
  free: { isFree: 'desc' },
}

// Mesma semântica em SQL bruto (FTS). Strings de um whitelist fechado — seguras
// para Prisma.raw. `rank` (ts_rank) é o desempate estável.
const FTS_ORDER: Record<ArtworkQuery['sort'], string> = {
  recent: `a."createdAt" DESC`,
  downloads: `(SELECT COUNT(*) FROM "Download" d WHERE d."artworkId" = a.id) DESC`,
  az: `a."title" ASC`,
  free: `a."isFree" DESC`,
}

// Visitantes só recebem a url de mockups (PNG/JPG). Vetores originais (CDR/AI/PDF/OTF)
// não expõem a chave R2 — download sempre via URL assinada.
function stripPrivateFiles(items: ArtworkWithRelations[]): ArtworkWithRelations[] {
  return items.map((art) => ({
    ...art,
    files: art.files.map((file) =>
      file.format === Format.PNG || file.format === Format.JPG
        ? file
        : ({ id: file.id, format: file.format, size: file.size, artworkId: file.artworkId } as typeof file)
    ),
  }))
}

function clampPage(page: number, total: number, pageSize: number): number {
  if (total <= 0) return 1
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return Math.min(page, totalPages)
}

function buildPrismaWhere(query: ArtworkQuery): Prisma.ArtworkWhereInput {
  const where: Prisma.ArtworkWhereInput = { status: Status.PUBLISHED }

  if (query.categoryId) where.categoryId = query.categoryId
  if (query.tagId) where.tags = { some: { id: query.tagId } }
  if (query.isFree !== undefined) where.isFree = query.isFree

  // Fallback de FTS para termos muito curtos (1 char): contains insensitivo.
  const term = query.q?.trim() ?? ''
  if (term.length === 1) {
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ]
  }

  // Overlay de favoritos (RF-4): filtra por ids do localStorage quando fav=1.
  if (query.onlyFavorites) {
    where.id = { in: query.ids && query.ids.length > 0 ? query.ids : [] }
  }

  return where
}

async function fetchPrismaPage(query: ArtworkQuery): Promise<ArtworkPageResult> {
  const where = buildPrismaWhere(query)
  const total = await prisma.artwork.count({ where })
  const safePage = clampPage(query.page, total, query.pageSize)
  const items = await prisma.artwork.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, slug: true, color: true } },
      tags: { select: { id: true, name: true } },
      files: { select: { id: true, format: true, url: true, size: true } },
      _count: { select: { downloads: true } },
    },
    orderBy: PRISMA_ORDER[query.sort],
    skip: (safePage - 1) * query.pageSize,
    take: query.pageSize,
  })

  return { items: stripPrivateFiles(items as unknown as ArtworkWithRelations[]), total, page: safePage, pageSize: query.pageSize }
}

function ftsWhereParts(query: ArtworkQuery, term: string): Prisma.Sql[] {
  const parts: Prisma.Sql[] = [
    Prisma.sql`a."search_vector" @@ plainto_tsquery('portuguese', ${term})`,
    Prisma.sql`a.status = 'PUBLISHED'`,
  ]

  if (query.categoryId) parts.push(Prisma.sql`a."categoryId" = ${query.categoryId}`)
  if (query.tagId)
    parts.push(Prisma.sql`EXISTS (SELECT 1 FROM "_ArtworkTags" at WHERE at."A" = a.id AND at."B" = ${query.tagId})`)
  if (query.isFree !== undefined) parts.push(Prisma.sql`a."isFree" = ${query.isFree}`)
  if (query.onlyFavorites) {
    parts.push(
      query.ids && query.ids.length > 0
        ? Prisma.sql`a.id = ANY(${query.ids})`
        : Prisma.sql`a.id = ANY('{}'::text[])`
    )
  }

  return parts
}

async function runFts(
  query: ArtworkQuery,
  term: string,
  orderBy: string,
  limit: number,
  offset: number
): Promise<Array<{ id: string; total: number }>> {
  const whereSql = Prisma.join(ftsWhereParts(query, term), ' AND ')
  const sql = Prisma.sql`
    SELECT a.id,
           COUNT(*) OVER() AS total
    FROM "Artwork" a
    WHERE ${whereSql}
    ORDER BY ${Prisma.raw(orderBy)}, ts_rank(a."search_vector", plainto_tsquery('portuguese', ${term})) DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return prisma.$queryRaw<Array<{ id: string; total: number }>>(sql)
}

async function fetchFtsPage(query: ArtworkQuery, term: string): Promise<ArtworkPageResult> {
  const orderBy = FTS_ORDER[query.sort]
  const offset = (query.page - 1) * query.pageSize

  let rows = await runFts(query, term, orderBy, query.pageSize, offset)
  const total = rows.length > 0 ? Number(rows[0].total) : 0

  // Normaliza página fora do intervalo (RF-2 / CA-2): refaz no último página.
  const safePage = clampPage(query.page, total, query.pageSize)
  if (safePage !== query.page && total > 0) {
    const newOffset = (safePage - 1) * query.pageSize
    rows = await runFts(query, term, orderBy, query.pageSize, newOffset)
  }

  if (rows.length === 0) {
    return { items: [], total, page: safePage, pageSize: query.pageSize }
  }

  const ids = rows.map((r) => r.id)
  const artworks = await prisma.artwork.findMany({
    where: { id: { in: ids } },
    include: {
      category: { select: { id: true, name: true, slug: true, color: true } },
      tags: { select: { id: true, name: true } },
      files: { select: { id: true, format: true, url: true, size: true } },
      _count: { select: { downloads: true } },
    },
  })

  // Preserva a ordanção do SQL (sort + rank) reordenando pelo id.
  const idOrder = new Map(ids.map((id, i) => [id, i]))
  const ordered = artworks.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

  return { items: stripPrivateFiles(ordered as unknown as ArtworkWithRelations[]), total, page: safePage, pageSize: query.pageSize }
}

// Fonte única de busca server-side, compartilhada pela rota GET /api/artworks e
// pelo Server Component da loja.
export async function fetchArtworkPage(query: ArtworkQuery): Promise<ArtworkPageResult> {
  const term = query.q?.trim() ?? ''
  if (term.length >= 2) {
    return fetchFtsPage(query, term)
  }
  return fetchPrismaPage(query)
}
