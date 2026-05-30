import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { artworkSchema } from '@/lib/validations/artwork'
import { generateSlug } from '@/lib/utils/slug'
import { Prisma, Status } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const tagId = searchParams.get('tagId')
    const search = searchParams.get('search')
    const isFree = searchParams.get('isFree')
    const slug = searchParams.get('slug')

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
        // Visitantes/público nunca recebem a URL/chave R2 do arquivo original;
        // o download acontece sempre via URL assinada no endpoint /api/downloads.
        files: {
          select: isAdminView
            ? { id: true, format: true, url: true, size: true, artworkId: true }
            : { id: true, format: true, size: true, artworkId: true },
        },
      },
      orderBy: { createdAt: 'desc' }
    })

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

    const { title, description, status, isFree, previewUrl, categoryId, tagNames, files } = result.data
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
