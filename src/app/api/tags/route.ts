import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { generateSlug } from '@/lib/utils/slug'
import { tagSchema } from '@/lib/validations/admin'

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, data: tags })
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao buscar tags' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const result = tagSchema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const cleanName = generateSlug(result.data.name)

    const tag = await prisma.tag.upsert({
      where: { name: cleanName },
      update: {},
      create: { name: cleanName },
    })

    return NextResponse.json({ success: true, data: tag }, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
