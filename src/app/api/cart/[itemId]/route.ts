import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { auth } from '@/lib/auth/auth'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

/** Remove um item específico do carrinho. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para remover itens do carrinho.' },
        { status: 401 }
      )
    }
    if (user.role !== Role.CLIENT) {
      return NextResponse.json(
        { success: false, error: 'Apenas clientes podem usar o carrinho.' },
        { status: 403 }
      )
    }

    const { itemId } = await params

    // Verifica se o item pertence ao carrinho do usuário logado.
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { userId: true } } },
    })

    if (!cartItem || cartItem.cart.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Item não encontrado no seu carrinho.' },
        { status: 404 }
      )
    }

    await prisma.cartItem.delete({ where: { id: itemId } })

    // Retorna o carrinho atualizado.
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            artwork: {
              select: {
                id: true,
                title: true,
                slug: true,
                previewUrl: true,
                priceCents: true,
                isFree: true,
              },
            },
          },
        },
      },
    })

    const totalCents = cart?.items.reduce((sum, item) => sum + item.artwork.priceCents, 0) ?? 0

    return NextResponse.json({
      success: true,
      data: { items: cart?.items ?? [], totalCents },
    })
  } catch (error) {
    console.error('[Cart Item DELETE]', error)
    return NextResponse.json({ success: false, error: 'Erro ao remover item do carrinho.' }, { status: 500 })
  }
}
