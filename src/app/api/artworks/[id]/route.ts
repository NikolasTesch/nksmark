import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma, Status } from '@prisma/client'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { artworkSchema } from '@/lib/validations/artwork'
import { generateSlug } from '@/lib/utils/slug'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Esta rota retorna `files` com a `url`/chave do R2 (campo sensível) e artes
    // em qualquer status (DRAFT/ARCHIVED). É consumida apenas pelo painel admin,
    // portanto exige ADMIN. O catálogo público usa GET /api/artworks (sem `url`).
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params
    const artwork = await prisma.artwork.findUnique({
      where: { id },
      include: {
        category: true,
        tags: true,
        files: true,
      },
    })

    if (!artwork) {
      return NextResponse.json({ success: false, error: 'Arte não localizada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: artwork })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro no servidor' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params
    const body = await req.json()
    const result = artworkSchema.partial().safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, description, status, isFree, priceCents, previewUrl, categoryId, tagNames, addGalleryImages, removeFileIds } = result.data
    const dataToUpdate: Prisma.ArtworkUpdateInput = {}

    if (title !== undefined) {
      dataToUpdate.title = title
      dataToUpdate.slug = generateSlug(title)
    }
    if (description !== undefined) dataToUpdate.description = description
    if (status !== undefined) dataToUpdate.status = status
    if (isFree !== undefined) dataToUpdate.isFree = isFree
    if (priceCents !== undefined) dataToUpdate.priceCents = priceCents
    if (previewUrl !== undefined) dataToUpdate.previewUrl = previewUrl
    if (categoryId !== undefined) {
      dataToUpdate.category = {
        connect: { id: categoryId }
      }
    }

    if (tagNames !== undefined) {
      dataToUpdate.tags = {
        set: [],
        connectOrCreate: tagNames.map((name) => {
          const cleanName = generateSlug(name)
          return {
            where: { name: cleanName },
            create: { name: cleanName },
          }
        }),
      }
    }

    await prisma.artwork.update({
      where: { id },
      data: dataToUpdate,
    })

    if (removeFileIds && removeFileIds.length > 0) {
      await prisma.file.deleteMany({
        where: { id: { in: removeFileIds }, artworkId: id },
      })
    }

    if (addGalleryImages && addGalleryImages.length > 0) {
      await prisma.file.createMany({
        data: addGalleryImages.map((img) => ({
          format: img.format as 'PNG' | 'JPG',
          url: img.url,
          size: img.size,
          artworkId: id,
        })),
      })
    }

    const updatedArtwork = await prisma.artwork.findUnique({
      where: { id },
      include: { category: true, tags: true, files: true },
    })

    return NextResponse.json({ success: true, data: updatedArtwork })
  } catch (error) {
    console.error('Error updating artwork:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params

    // Regra inviolável: nunca deletar artes fisicamente — arquivar via status.
    const archivedArtwork = await prisma.artwork.update({
      where: { id },
      data: { status: Status.ARCHIVED },
    })

    return NextResponse.json({ success: true, data: archivedArtwork })
  } catch (error) {
    console.error('Error archiving artwork:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
