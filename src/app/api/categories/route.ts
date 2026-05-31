import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { generateSlug } from '@/lib/utils/slug'
import { categorySchema } from '@/lib/validations/admin'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { filterOrder: 'asc' },
    })
    return NextResponse.json({ success: true, data: categories })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao buscar categorias' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const result = categorySchema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, color } = result.data
    const slug = generateSlug(name)

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        color: color || null,
        showInFilter: true,
      },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
