import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { addArtworkToCollectionSchema } from '@/validations/collection'

export async function POST(
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
    const result = addArtworkToCollectionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 },
      )
    }

    const { artworkId, order } = result.data

    // Verify collection exists
    const collection = await prisma.collection.findUnique({
      where: { slug },
    })

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Coleção não encontrada' },
        { status: 404 },
      )
    }

    // Verify artwork exists
    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
    })

    if (!artwork) {
      return NextResponse.json(
        { success: false, error: 'Arte não encontrada' },
        { status: 404 },
      )
    }

    // Auto-assign order = max existing + 1 if not provided
    let finalOrder = order
    if (finalOrder === undefined) {
      const maxOrderEntry = await prisma.collectionArtwork.findFirst({
        where: { collectionId: collection.id },
        orderBy: { order: 'desc' },
      })
      finalOrder = maxOrderEntry ? maxOrderEntry.order + 1 : 0
    }

    const collectionArtwork = await prisma.collectionArtwork.create({
      data: {
        collectionId: collection.id,
        artworkId,
        order: finalOrder,
      },
      include: {
        artwork: {
          include: {
            category: true,
            tags: true,
            files: {
              select: { id: true, format: true, url: true, size: true, artworkId: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: collectionArtwork }, { status: 201 })
  } catch (error) {
    // Unique constraint violation — composite PK (collectionId + artworkId) prevents duplicates
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Esta arte já está na coleção' },
        { status: 409 },
      )
    }

    console.error('Error adding artwork to collection:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor' },
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
    const { artworkId, order } = body

    if (!artworkId || typeof artworkId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID da arte é obrigatório' },
        { status: 400 },
      )
    }

    if (typeof order !== 'number' || !Number.isInteger(order) || order < 0) {
      return NextResponse.json(
        { success: false, error: 'Ordem inválida (deve ser um inteiro >= 0)' },
        { status: 400 },
      )
    }

    const collection = await prisma.collection.findUnique({ where: { slug } })
    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Coleção não encontrada' },
        { status: 404 },
      )
    }

    const entry = await prisma.collectionArtwork.findUnique({
      where: {
        collectionId_artworkId: {
          collectionId: collection.id,
          artworkId,
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Arte não encontrada nesta coleção' },
        { status: 404 },
      )
    }

    // Swap-aware reorder: ao mover o item para a posição `order`, ajusta os
    // vizinhos para manter a sequência contígua e sem lacunas.
    const items = await prisma.collectionArtwork.findMany({
      where: { collectionId: collection.id },
      orderBy: { order: 'asc' },
    })

    const movingItem = items.find((i) => i.artworkId === artworkId)
    if (!movingItem) {
      return NextResponse.json(
        { success: false, error: 'Item não encontrado' },
        { status: 404 },
      )
    }

    const filtered = items.filter((i) => i.artworkId !== artworkId)
    const clampedOrder = Math.max(0, Math.min(order, filtered.length))
    filtered.splice(clampedOrder, 0, movingItem)

    // Reatribui `order` sequencialmente para todos os itens (0..n-1).
    await prisma.$transaction(
      filtered.map((item, idx) =>
        prisma.collectionArtwork.update({
          where: {
            collectionId_artworkId: {
              collectionId: item.collectionId,
              artworkId: item.artworkId,
            },
          },
          data: { order: idx },
        }),
      ),
    )

    return NextResponse.json({ success: true, data: { message: 'Ordem atualizada' } })
  } catch (error) {
    console.error('Error reordering collection artwork:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor' },
      { status: 500 },
    )
  }
}

export async function DELETE(
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
    const { artworkId } = body

    if (!artworkId || typeof artworkId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID da arte é obrigatório' },
        { status: 400 },
      )
    }

    // Verify collection exists
    const collection = await prisma.collection.findUnique({
      where: { slug },
    })

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Coleção não encontrada' },
        { status: 404 },
      )
    }

    const entry = await prisma.collectionArtwork.findUnique({
      where: {
        collectionId_artworkId: {
          collectionId: collection.id,
          artworkId,
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Arte não encontrada nesta coleção' },
        { status: 404 },
      )
    }

    await prisma.collectionArtwork.delete({
      where: {
        collectionId_artworkId: {
          collectionId: collection.id,
          artworkId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Arte removida da coleção' },
    })
  } catch (error) {
    console.error('Error removing artwork from collection:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor' },
      { status: 500 },
    )
  }
}
