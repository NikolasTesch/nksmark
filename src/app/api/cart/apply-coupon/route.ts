import { NextResponse } from 'next/server'
import { DiscountType, Role } from '@prisma/client'
import { auth } from '@/lib/auth/auth'
import prisma from '@/lib/prisma'
import { applyCouponSchema } from '@/validations/coupon'

export const runtime = 'nodejs'

/** Aplica um cupom de desconto ao carrinho do cliente logado. */
export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login.' },
        { status: 401 }
      )
    }
    if (user.role !== Role.CLIENT) {
      return NextResponse.json(
        { success: false, error: 'Apenas clientes.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const result = applyCouponSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Código de cupom inválido.' },
        { status: 400 }
      )
    }

    const { code } = result.data

    // Get user's cart with items
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            artwork: { select: { priceCents: true } },
          },
        },
      },
    })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Carrinho vazio.' },
        { status: 400 }
      )
    }

    // Find coupon
    const coupon = await prisma.coupon.findUnique({ where: { code } })
    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Cupom não encontrado.' },
        { status: 404 }
      )
    }
    if (!coupon.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cupom inativo.' },
        { status: 400 }
      )
    }
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Cupom expirado.' },
        { status: 400 }
      )
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { success: false, error: 'Cupom esgotado.' },
        { status: 400 }
      )
    }

    const totalCents = cart.items.reduce((sum, item) => sum + item.artwork.priceCents, 0)

    if (coupon.minPurchaseCents && totalCents < coupon.minPurchaseCents) {
      return NextResponse.json(
        {
          success: false,
          error: `Valor mínimo de R$ ${(coupon.minPurchaseCents / 100).toFixed(2)} para este cupom.`,
        },
        { status: 400 }
      )
    }

    // Calculate discount
    let discountCents = 0
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountCents = Math.round((totalCents * coupon.discountValue) / 100)
    } else {
      // FIXED: cap at total to prevent negative final
      discountCents = Math.min(coupon.discountValue, totalCents)
    }

    const finalTotal = totalCents - discountCents

    return NextResponse.json({
      success: true,
      data: {
        couponCode: coupon.code,
        originalTotal: totalCents,
        discountCents,
        finalTotal: finalTotal >= 0 ? finalTotal : 0,
      },
    })
  } catch (error) {
    console.error('[Apply Coupon POST]', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao aplicar cupom.' },
      { status: 500 }
    )
  }
}

/** Remove o cupom aplicado (retorna total sem desconto). */
export async function DELETE() {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login.' },
        { status: 401 }
      )
    }
    if (user.role !== Role.CLIENT) {
      return NextResponse.json(
        { success: false, error: 'Apenas clientes.' },
        { status: 403 }
      )
    }

    // Get cart total
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            artwork: { select: { priceCents: true } },
          },
        },
      },
    })

    const totalCents =
      cart?.items.reduce((sum, item) => sum + item.artwork.priceCents, 0) ?? 0

    return NextResponse.json({
      success: true,
      data: {
        originalTotal: totalCents,
        discountCents: 0,
        finalTotal: totalCents,
      },
    })
  } catch (error) {
    console.error('[Apply Coupon DELETE]', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover cupom.' },
      { status: 500 }
    )
  }
}
