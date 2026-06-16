import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { createCollectionSchema } from '@/validations/collection'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { slug } = await params

    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        artworks: {
          orderBy: { order: 'asc' },
          include: {
            artwork: {
              include: {
                tags: true,
                files: {
                  select: {
                    id: true,
                    format: true,
                    url: true,
                    size: true,
                    artworkId: true,
                  },
                },
                category: true,
              },
            },
          },
        },
      },
    })

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Coleção não encontrada' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: collection })
  } catch (error) {
    console.error('Error fetching collection:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar coleção' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { slug } = await params
    const body = await req.json()

    const updateSchema = createCollectionSchema.partial()
    const result = updateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 },
      )
    }

    const { title, slug: newSlug, description } = result.data
    const dataToUpdate: Record<string, unknown> = {}

    if (title !== undefined) {
      dataToUpdate.title = title
    }

    if (newSlug !== undefined) {
      // Check slug uniqueness excluding the current collection
      const existingCollection = await prisma.collection.findUnique({
        where: { slug: newSlug },
      })

      if (existingCollection && existingCollection.slug !== slug) {
        return NextResponse.json(
          { success: false, error: 'Já existe uma coleção com este slug' },
          { status: 409 },
        )
      }

      dataToUpdate.slug = newSlug
    }

    if (description !== undefined) {
      dataToUpdate.description = description
    }

    const updatedCollection = await prisma.collection.update({
      where: { slug },
      data: dataToUpdate,
    })

    return NextResponse.json({ success: true, data: updatedCollection })
  } catch (error) {
    console.error('Error updating collection:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar coleção' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { slug } = await params

    const collection = await prisma.collection.findUnique({
      where: { slug },
    })

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Coleção não encontrada' },
        { status: 404 },
      )
    }

    // CollectionArtwork entries cascade on delete — artworks themselves are preserved.
    await prisma.collection.delete({
      where: { slug },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Coleção removida com sucesso' },
    })
  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir coleção' },
      { status: 500 },
    )
  }
}
