import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'

export async function GET() {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: tickets })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar os chamados.' }, { status: 500 })
  }
}
