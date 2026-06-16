import { NextResponse } from 'next/server'
import { Role, Status } from '@prisma/client'
import { auth } from '@/lib/auth/auth'
import prisma from '@/lib/prisma'
import { addToCartSchema } from '@/lib/validations/cart'

export const runtime = 'nodejs'

/** Lista os itens do carrinho do cliente logado. */
export async function GET() {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para ver o carrinho.' },
        { status: 401 }
      )
    }
    if (user.role !== Role.CLIENT) {
      return NextResponse.json(
        { success: false, error: 'Apenas clientes podem usar o carrinho.' },
        { status: 403 }
      )
    }

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

    if (!cart) {
      return NextResponse.json({ success: true, data: { items: [], totalCents: 0 } })
    }

    const totalCents = cart.items.reduce((sum, item) => sum + item.artwork.priceCents, 0)

    return NextResponse.json({
      success: true,
      data: { items: cart.items, totalCents },
    })
  } catch (error) {
    console.error('[Cart GET]', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar carrinho.' }, { status: 500 })
  }
}

/** Adiciona uma arte ao carrinho do cliente. */
export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para adicionar ao carrinho.' },
        { status: 401 }
      )
    }
    if (user.role !== Role.CLIENT) {
      return NextResponse.json(
        { success: false, error: 'Apenas clientes podem usar o carrinho.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const result = addToCartSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { artworkId } = result.data

    // Verifica se a arte existe, está publicada e não é gratuita.
    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } })
    if (!artwork || artwork.status !== Status.PUBLISHED) {
      return NextResponse.json(
        { success: false, error: 'Arte não disponível para compra.' },
        { status: 404 }
      )
    }
    if (artwork.isFree) {
      return NextResponse.json(
        { success: false, error: 'Artes gratuitas não precisam ser adicionadas ao carrinho.' },
        { status: 400 }
      )
    }

    // Verifica se já está no carrinho.
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cart: { userId: user.id },
        artworkId,
      },
    })
    if (existingItem) {
      return NextResponse.json(
        { success: false, error: 'Esta arte já está no seu carrinho.' },
        { status: 409 }
      )
    }

    // Garante que o carrinho existe (upsert = find or create).
    const cart = await prisma.cart.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })

    // Adiciona o item ao carrinho.
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        artworkId: artwork.id,
      },
    })

    // Retorna o carrinho completo atualizado.
    const updatedCart = await prisma.cart.findUnique({
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

    const totalCents = updatedCart!.items.reduce((sum, item) => sum + item.artwork.priceCents, 0)

    return NextResponse.json(
      { success: true, data: { items: updatedCart!.items, totalCents } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Cart POST]', error)
    return NextResponse.json({ success: false, error: 'Erro ao adicionar ao carrinho.' }, { status: 500 })
  }
}

/** Limpa todo o carrinho do cliente. */
export async function DELETE() {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para limpar o carrinho.' },
        { status: 401 }
      )
    }
    if (user.role !== Role.CLIENT) {
      return NextResponse.json(
        { success: false, error: 'Apenas clientes podem usar o carrinho.' },
        { status: 403 }
      )
    }

    // Remove o carrinho inteiro (cascade deleta os CartItems).
    await prisma.cart.deleteMany({ where: { userId: user.id } })

    return NextResponse.json({ success: true, data: { items: [], totalCents: 0 } })
  } catch (error) {
    console.error('[Cart DELETE]', error)
    return NextResponse.json({ success: false, error: 'Erro ao limpar carrinho.' }, { status: 500 })
  }
}
