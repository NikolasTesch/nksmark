import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { hashPassword } from '@/lib/auth/password'
import { Role } from '@prisma/client'
import { userCreateSchema } from '@/lib/validations/admin'

// Campos seguros para retornar ao cliente (nunca expor passwordHash).
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const

export async function GET() {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    // Página de gestão de equipe: lista apenas membros com acesso (FASE/ADMIN).
    // Usuários rebaixados para VISITOR (acesso revogado) não aparecem aqui.
    const users = await prisma.user.findMany({
      where: { role: { in: [Role.FASE, Role.ADMIN] } },
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar equipe.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const result = userCreateSchema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email: emailClean, role, password } = result.data

    // Check if user already exists
    const userExists = await prisma.user.findUnique({
      where: { email: emailClean }
    })

    if (userExists) {
      return NextResponse.json({ success: false, error: 'Este e-mail já está cadastrado.' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: emailClean,
        role: role === 'ADMIN' ? Role.ADMIN : Role.FASE,
        passwordHash: await hashPassword(password),
      },
      select: publicUserSelect,
    })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor.' }, { status: 500 })
  }
}
