import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { artworkSchema } from '@/lib/validations/artwork'
import { generateSlug } from '@/lib/utils/slug'
import { Prisma, Status, Format } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const tagId = searchParams.get('tagId')
    const search = searchParams.get('search')
    const isFree = searchParams.get('isFree')
    const slug = searchParams.get('slug')
    const fts = searchParams.get('fts') === 'true'
    const ftsQuery = searchParams.get('q')?.trim()

    // When ?fts=true&q=termo is present, delegate to the dedicated FTS search
    if (fts && ftsQuery && ftsQuery.length >= 2) {
      const results = await prisma.$queryRaw<Array<{
        id: string; title: string; slug: string; description: string | null;
        previewUrl: string; priceCents: number; isFree: boolean;
        categoryId: string; createdAt: Date; rank: number;
      }>>`
        SELECT a.id, a.title, a.slug, a.description, a."previewUrl",
               a."priceCents", a."isFree", a."categoryId", a."createdAt",
               ts_rank(a."search_vector", plainto_tsquery('portuguese', ${ftsQuery})) AS rank
        FROM "Artwork" a
        WHERE a."search_vector" @@ plainto_tsquery('portuguese', ${ftsQuery})
          AND a.status = 'PUBLISHED'
        ORDER BY rank DESC
        LIMIT 50
      `

      if (results.length > 0) {
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
        const idOrder = new Map(ids.map((id, i) => [id, i]))
        const ordered = artworks.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))
        return NextResponse.json({ success: true, data: ordered })
      }

      return NextResponse.json({ success: true, data: [] })
    }

    const isAdminView = searchParams.get('admin') === 'true'

    const where: Prisma.ArtworkWhereInput = {}

    if (isAdminView) {
      const authStatus = await protectAdminRoute()
      if (!authStatus.authorized) {
        return authStatus.response
      }
    } else {
      where.status = Status.PUBLISHED
    }

    if (slug) {
      where.slug = slug
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (tagId) {
      where.tags = {
        some: { id: tagId }
      }
    }

    if (isFree === 'true') {
      where.isFree = true
    } else if (isFree === 'false') {
      where.isFree = false
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const artworks = await prisma.artwork.findMany({
      where,
      include: {
        category: true,
        tags: true,
        files: {
          select: { id: true, format: true, url: true, size: true, artworkId: true },
        },
        // Contagem de downloads para a ordenação "mais baixadas" no client.
        _count: { select: { downloads: true } },
      },
      orderBy: { createdAt: 'desc' }
    })

    // Visitantes/público só recebem a `url` de mockups (PNG/JPG), usados na galeria
    // de preview. A URL/chave R2 dos vetores originais (CDR/AI/PDF/OTF) é removida —
    // o download desses arquivos acontece sempre via URL assinada em /api/downloads.
    if (!isAdminView) {
      for (const artwork of artworks) {
        artwork.files = artwork.files.map((file) => {
          if (file.format === Format.PNG || file.format === Format.JPG) {
            return file
          }
          // Reconstrói o arquivo sem a `url` para não vazar o caminho do vetor original.
          return {
            id: file.id,
            format: file.format,
            size: file.size,
            artworkId: file.artworkId,
          } as typeof file
        })
      }
    }

    return NextResponse.json({ success: true, data: artworks })
  } catch (error) {
    console.error('Error fetching artworks:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar artes no catálogo' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const body = await req.json()
    const result = artworkSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, description, status, isFree, priceCents, previewUrl, categoryId, tagNames, files } = result.data
    const slug = generateSlug(title)

    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!categoryExists) {
      return NextResponse.json({ success: false, error: 'Categoria inválida' }, { status: 400 })
    }

    const tagConnectOrCreate = tagNames ? tagNames.map(name => {
      const cleanName = generateSlug(name)
      return {
        where: { name: cleanName },
        create: { name: cleanName }
      }
    }) : []

    const artwork = await prisma.artwork.create({
      data: {
        title,
        slug,
        description: description || null,
        status,
        isFree,
        priceCents,
        previewUrl,
        categoryId,
        tags: {
          connectOrCreate: tagConnectOrCreate
        },
        files: {
          create: files.map(file => ({
            format: file.format,
            url: file.url,
            size: file.size
          }))
        }
      },
      include: {
        category: true,
        tags: true,
        files: true
      }
    })

    return NextResponse.json({ success: true, data: artwork }, { status: 201 })
  } catch (error) {
    console.error('Error creating artwork:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
