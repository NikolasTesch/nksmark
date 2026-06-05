import { NextResponse } from 'next/server'
import { OrderStatus, Role, Status } from '@prisma/client'
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

/** Cria um pedido de compra de uma arte e a preference do Mercado Pago. */
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

    const { artworkId } = result.data

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } })
    if (!artwork || artwork.status !== Status.PUBLISHED) {
      return NextResponse.json(
        { success: false, error: 'Arte não disponível para compra.' },
        { status: 404 }
      )
    }

    if (artwork.isFree) {
      return NextResponse.json(
        { success: false, error: 'Esta arte é gratuita — não é necessário comprar.' },
        { status: 400 }
      )
    }

    // Bloqueia recompra: se já existe um pedido PAGO, o download já está liberado.
    const alreadyPaid = await prisma.order.findFirst({
      where: { userId: user.id, artworkId, status: OrderStatus.PAID },
      select: { id: true },
    })
    if (alreadyPaid) {
      return NextResponse.json(
        { success: false, error: 'Você já comprou esta arte. Acesse "Minhas Compras" para baixar.' },
        { status: 409 }
      )
    }

    // Preço lido sempre do servidor — nunca confiar em valor vindo do cliente.
    const amountCents = artwork.priceCents

    const order = await prisma.order.create({
      data: { userId: user.id, artworkId, amountCents, status: OrderStatus.PENDING },
    })

    try {
      const base = appUrl()
      const { preferenceId, initPoint } = await createPreference({
        orderId: order.id,
        title: artwork.title,
        unitPrice: amountCents / 100,
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
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = orders.map((o) => ({
      id: o.id,
      status: o.status,
      amountCents: o.amountCents,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
      artwork: o.artwork,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error listing orders:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar pedidos.' }, { status: 500 })
  }
}
