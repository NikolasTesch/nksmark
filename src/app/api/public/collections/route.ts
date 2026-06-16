import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const artworkId = searchParams.get('artworkId')
    const slug = searchParams.get('slug')

    // Query by artworkId: collections that contain this artwork
    if (artworkId) {
      const collectionArtworks = await prisma.collectionArtwork.findMany({
        where: { artworkId },
        include: {
          collection: {
            include: {
              artworks: {
                where: { artwork: { status: 'PUBLISHED' } },
                include: {
                  artwork: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      previewUrl: true,
                      priceCents: true,
                      isFree: true,
                      category: {
                        select: { id: true, name: true, slug: true },
                      },
                    },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      })

      const collections = collectionArtworks.map((ca) => ({
        id: ca.collection.id,
        title: ca.collection.title,
        slug: ca.collection.slug,
        description: ca.collection.description,
        artworks: ca.collection.artworks.map((a) => a.artwork),
      }))

      return NextResponse.json({ success: true, data: { collections } })
    }

    // Query by slug: single collection detail
    if (slug) {
      const collection = await prisma.collection.findUnique({
        where: { slug },
        include: {
          artworks: {
            where: { artwork: { status: 'PUBLISHED' } },
            include: {
              artwork: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  previewUrl: true,
                  priceCents: true,
                  isFree: true,
                  category: {
                    select: { id: true, name: true, slug: true },
                  },
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      })

      if (!collection) {
        return NextResponse.json(
          { success: false, error: 'Coleção não encontrada' },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          id: collection.id,
          title: collection.title,
          slug: collection.slug,
          description: collection.description,
          artworks: collection.artworks.map((a) => a.artwork),
        },
      })
    }

    // No filters: return all collections with PUBLISHED artwork count
    const collections = await prisma.collection.findMany({
      include: {
        _count: {
          select: { artworks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: { collections } })
  } catch (error) {
    console.error('Error fetching public collections:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar coleções' },
      { status: 500 },
    )
  }
}
