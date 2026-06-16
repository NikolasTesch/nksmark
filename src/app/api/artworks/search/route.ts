import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Search via FTS with ranking
    const results = await prisma.$queryRaw<Array<{
      id: string; title: string; slug: string; description: string | null;
      previewUrl: string; priceCents: number; isFree: boolean;
      categoryId: string; createdAt: Date; rank: number;
    }>>`
      SELECT a.id, a.title, a.slug, a.description, a."previewUrl",
             a."priceCents", a."isFree", a."categoryId", a."createdAt",
             ts_rank(a."search_vector", plainto_tsquery('portuguese', ${query})) AS rank
      FROM "Artwork" a
      WHERE a."search_vector" @@ plainto_tsquery('portuguese', ${query})
        AND a.status = 'PUBLISHED'
      ORDER BY rank DESC
      LIMIT 50
    `

    if (results.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Fetch full relations
    const ids = results.map(r => r.id)
    const artworks = await prisma.artwork.findMany({
      where: { id: { in: ids } },
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { id: true, name: true } },
        files: { select: { id: true, format: true, url: true, size: true } },
        _count: { select: { downloads: true } },
      },
    })

    // Restore FTS rank order
    const idOrder = new Map(ids.map((id, i) => [id, i]))
    const ordered = artworks.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

    return NextResponse.json({ success: true, data: ordered })
  } catch (error) {
    console.error('[FTS Search Error]', error)
    return NextResponse.json({ success: false, error: 'Erro na busca.' }, { status: 500 })
  }
}
