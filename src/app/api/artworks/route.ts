import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectArtworkManagementRoute } from '@/lib/auth/middleware'
import { artworkSchema } from '@/lib/validations/artwork'
import { generateSlug } from '@/lib/utils/slug'
import { Format } from '@prisma/client'
import { logger as log } from '@/lib/utils/logger'
import { parseArtworkQuery } from '@/lib/validations/artwork-query'
import { fetchArtworkPage } from '@/lib/artworks/query'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const isAdminView = searchParams.get('admin') === 'true'

    // Lookup por slug (detalhe da arte + minhas-compras) — contrato legado {success,data}.
    if (slug) {
      const artworks = await prisma.artwork.findMany({
        where: { slug },
        include: {
          category: true,
          tags: true,
          files: { select: { id: true, format: true, url: true, size: true, artworkId: true } },
          _count: { select: { downloads: true } },
        },
      })

      for (const artwork of artworks) {
        artwork.files = artwork.files.map((file) => {
          if (file.format === Format.PNG || file.format === Format.JPG) return file
          return {
            id: file.id,
            format: file.format,
            size: file.size,
            artworkId: file.artworkId,
          } as typeof file
        })
      }

      return NextResponse.json({ success: true, data: artworks })
    }

    // Visão admin/equipe interna: todos os status, arquivos completos — contrato legado {success,data}.
    if (isAdminView) {
      const authStatus = await protectArtworkManagementRoute()
      if (!authStatus.authorized) return authStatus.response

      const artworks = await prisma.artwork.findMany({
        include: {
          category: true,
          tags: true,
          files: { select: { id: true, format: true, url: true, size: true, artworkId: true } },
          _count: { select: { downloads: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ success: true, data: artworks })
    }

    // Catálogo público (loja): filtros/ordenação/paginação server-side via helper
    // compartilhado. Contrato novo: {items, total, page, pageSize}.
    const query = parseArtworkQuery(searchParams)
    const result = await fetchArtworkPage(query)
    return NextResponse.json({
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    })
  } catch (error) {
    log.error('Error fetching artworks:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar artes no catálogo' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authStatus = await protectArtworkManagementRoute()
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
    log.error('Error creating artwork:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
