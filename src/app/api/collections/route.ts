import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { createCollectionSchema } from '@/validations/collection'
import { generateSlug } from '@/lib/utils/slug'
import { z } from 'zod'

export async function GET() {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const collections = await prisma.collection.findMany({
      include: {
        _count: { select: { artworks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: collections })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar coleções' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const body = await req.json()

    // Make slug optional — auto-generate from title when not provided
    const createSchema = createCollectionSchema.extend({
      slug: z.string().optional(),
    })

    const result = createSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 },
      )
    }

    const { title, slug, description } = result.data
    const finalSlug = slug || generateSlug(title)

    // Check slug uniqueness
    const existingCollection = await prisma.collection.findUnique({
      where: { slug: finalSlug },
    })

    if (existingCollection) {
      return NextResponse.json(
        { success: false, error: 'Já existe uma coleção com este slug' },
        { status: 409 },
      )
    }

    const collection = await prisma.collection.create({
      data: {
        title,
        slug: finalSlug,
        description: description || null,
      },
    })

    return NextResponse.json({ success: true, data: collection }, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
