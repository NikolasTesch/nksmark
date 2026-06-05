import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { registerSchema } from '@/lib/validations/auth'
import { hashPassword } from '@/lib/auth/password'
import prisma from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Auto-cadastro público de clientes pagantes (role CLIENT). Equipe FASE/ADMIN
// continua sendo criada manualmente pelo admin — não passa por aqui.
export async function POST(req: Request) {
  try {
    // Endpoint público: limita por IP para evitar criação em massa de contas.
    const ip = await getClientIp()
    const limit = rateLimit(`register:${ip}`, 5, 60_000)
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: 'Muitas tentativas de cadastro. Aguarde um momento e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      )
    }

    const body = await req.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = result.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Já existe uma conta com este e-mail.' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: Role.CLIENT },
    })

    return NextResponse.json({ success: true, data: { id: user.id } }, { status: 201 })
  } catch (error) {
    console.error('Error in register API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}
