import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params
    const { status } = await req.json()

    if (status !== 'PENDING' && status !== 'RESOLVED') {
      return NextResponse.json({ success: false, error: 'Status inválido.' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar o chamado.' }, { status: 500 })
  }
}
