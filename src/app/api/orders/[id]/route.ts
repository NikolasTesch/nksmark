import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { auth } from '@/lib/auth/auth'
import prisma from '@/lib/prisma'

// Status de um pedido — usado pela página de sucesso para fazer polling até
// o webhook confirmar o pagamento.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para ver o pedido.' },
        { status: 401 }
      )
    }

    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: { artwork: { select: { id: true, title: true, slug: true } } },
    })

    // Não vaza existência de pedidos de outros usuários (admin pode ver qualquer um).
    if (!order || (order.userId !== user.id && user.role !== Role.ADMIN)) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        amountCents: order.amountCents,
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        artwork: order.artwork,
      },
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar pedido.' }, { status: 500 })
  }
}
