import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { generateSlug } from '@/lib/utils/slug'

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

    const { name } = await req.json()

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nome da tag é obrigatório' }, { status: 400 })
    }

    const cleanName = generateSlug(name)

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
