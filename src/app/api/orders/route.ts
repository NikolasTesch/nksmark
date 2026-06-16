import { NextResponse } from 'next/server'
import { DiscountType, OrderStatus, Role, Status } from '@prisma/client'
import { auth } from '@/lib/auth/auth'
import { createOrderSchema } from '@/lib/validations/order'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { createPreference } from '@/lib/payments/mercadopago'

// SDK/crypto e chamada externa exigem runtime Node.
export const runtime = 'nodejs'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/** Cria um pedido de compra (single, multi-item ou carrinho) e a preference do Mercado Pago. */
export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role; email?: string; name?: string } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para comprar.' },
        { status: 401 }
      )
    }

    // Só clientes compram. Equipe interna (FASE/ADMIN) baixa sem pagar.
    if (user.role !== Role.CLIENT) {
      return NextResponse.json(
        { success: false, error: 'Apenas contas de cliente podem realizar compras.' },
        { status: 403 }
      )
    }

    const limit = rateLimit(`order:${user.id}`, 10, 60_000)
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: 'Muitas tentativas de compra em sequência. Aguarde um momento.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      )
    }

    const body = await req.json()
    const result = createOrderSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { artworkId, artworkIds, couponCode } = result.data

    // Normaliza para uma lista de IDs — suporta ambos os formatos.
    let ids: string[] = artworkIds || (artworkId ? [artworkId] : [])

    // Se nenhum ID foi informado, carrega os itens do carrinho do usuário.
    if (ids.length === 0) {
      const cart = await prisma.cart.findUnique({
        where: { userId: user.id },
        include: { items: true },
      })
      if (!cart || cart.items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Carrinho vazio.' },
          { status: 400 }
        )
      }
      ids = cart.items.map((i) => i.artworkId)
    }

    // Busca todas as artes de uma vez.
    const artworks = await prisma.artwork.findMany({
      where: { id: { in: ids } },
    })

    const artworkMap = new Map(artworks.map((a) => [a.id, a]))

    // Valida cada arte individualmente.
    for (const id of ids) {
      const art = artworkMap.get(id)
      if (!art || art.status !== Status.PUBLISHED) {
        return NextResponse.json(
          { success: false, error: 'Uma ou mais artes não estão disponíveis para compra.' },
          { status: 404 }
        )
      }

      if (art.isFree) {
        return NextResponse.json(
          { success: false, error: `A arte "${art.title}" é gratuita — não é necessário comprar.` },
          { status: 400 }
        )
      }

      // Verifica recompra via OrderItem (cobre tanto pedidos novos quanto legados migrados).
      const alreadyPaid = await prisma.orderItem.findFirst({
        where: {
          artworkId: id,
          order: { userId: user.id, status: OrderStatus.PAID },
        },
        select: { id: true },
      })
      if (alreadyPaid) {
        return NextResponse.json(
          { success: false, error: `Você já comprou "${art.title}". Acesse "Minhas Compras" para baixar.` },
          { status: 409 }
        )
      }
    }

    // Preços lidos sempre do servidor — nunca confiar em valor vindo do cliente.
    const totalCents = artworks.reduce((sum, a) => sum + a.priceCents, 0)
    let amountCents = totalCents
    let couponId: string | null = null

    // Valida cupom de desconto no servidor.
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } })
      if (!coupon || !coupon.isActive) {
        return NextResponse.json(
          { success: false, error: 'Cupom inválido ou inativo.' },
          { status: 400 }
        )
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Este cupom expirou.' },
          { status: 400 }
        )
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json(
          { success: false, error: 'Este cupom já atingiu o limite de usos.' },
          { status: 400 }
        )
      }
      if (coupon.minPurchaseCents && totalCents < coupon.minPurchaseCents) {
        return NextResponse.json(
          { success: false, error: `Valor mínimo de compra não atingido (R$ ${(coupon.minPurchaseCents / 100).toFixed(2)}).` },
          { status: 400 }
        )
      }

      // Aplica o desconto.
      if (coupon.discountType === DiscountType.PERCENTAGE) {
        amountCents = totalCents - Math.round((totalCents * coupon.discountValue) / 100)
      } else {
        // FIXED em centavos
        amountCents = Math.max(0, totalCents - coupon.discountValue)
      }
      couponId = coupon.id
    }

    // Cria o pedido com os itens. Para legado, mantém artworkId na ordem se for single item.
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        artworkId: ids.length === 1 ? ids[0] : undefined,
        amountCents,
        status: OrderStatus.PENDING,
        couponId,
        items: {
          create: artworks.map((a) => ({
            artworkId: a.id,
            amountCents: a.priceCents,
          })),
        },
      },
    })

    try {
      const base = appUrl()
      const { preferenceId, initPoint } = await createPreference({
        orderId: order.id,
        items: artworks.map((a) => ({
          id: a.id,
          title: a.title,
          unitPrice: a.priceCents / 100,
          quantity: 1,
        })),
        payerEmail: user.email || 'comprador@nksart.com.br',
        successUrl: `${base}/compra/sucesso?order=${order.id}`,
        pendingUrl: `${base}/compra/pendente?order=${order.id}`,
        failureUrl: `${base}/compra/falha?order=${order.id}`,
        notificationUrl: `${base}/api/payments/webhook`,
      })

      await prisma.order.update({
        where: { id: order.id },
        data: { mpPreferenceId: preferenceId },
      })

      // Limpa o carrinho do usuário após checkout bem-sucedido.
      await prisma.cartItem.deleteMany({
        where: { cart: { userId: user.id }, artworkId: { in: ids } },
      })

      return NextResponse.json(
        { success: true, data: { orderId: order.id, initPoint } },
        { status: 201 }
      )
    } catch (err) {
      // A preference falhou: marca o pedido como FAILED para não deixar lixo PENDING.
      console.error('Error creating Mercado Pago preference:', err)
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED },
      })
      return NextResponse.json(
        { success: false, error: 'Não foi possível iniciar o pagamento. Tente novamente.' },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('Error in orders API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}

/** Lista os pedidos do cliente logado. */
export async function GET() {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; role?: Role } | undefined

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para ver suas compras.' },
        { status: 401 }
      )
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        artwork: { select: { id: true, title: true, slug: true, previewUrl: true } },
        items: {
          include: { artwork: { select: { id: true, title: true, slug: true, previewUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = orders.map((o) => ({
      id: o.id,
      status: o.status,
      amountCents: o.amountCents,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
      artwork: o.artwork, // legacy compat
      items: o.items, // multi-item
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error listing orders:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar pedidos.' }, { status: 500 })
  }
}
