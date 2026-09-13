import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import prisma from '@/lib/prisma'
import { createPreapproval, getPreapproval } from '@/lib/payments/preapproval'
import { logger as log } from '@/lib/utils/logger'

export const runtime = 'nodejs'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Cria (ou reusa) a assinatura do acervo e devolve o `init_point` do checkout
 * hospedado do Mercado Pago.
 *
 * - Reusa o registro local existente (mesmo cancelado/reconciliado) para
 *   respeitar o `@unique` em `userId` e cria um novo preapproval no MP.
 * - A assinatura local nasce `pending`; vira `authorized` via webhook/retorno.
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string; email?: string } | undefined
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para assinar o acervo.' },
        { status: 401 },
      )
    }

    const amountCents = parseInt(process.env.MP_ACERVO_AMOUNT_CENTS || '2990', 10)
    const backUrl = `${appUrl()}/assinatura/retorno`

    const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })

    // Reuso: preapproval ativo/pendente já existe → devolve o init_point atual.
    if (existing && existing.mpPreapprovalId && existing.status !== 'cancelled') {
      try {
        const pre = await getPreapproval(existing.mpPreapprovalId)
        if (pre.initPoint) {
          return NextResponse.json({ success: true, data: { initPoint: pre.initPoint } })
        }
      } catch (e) {
        log.warn('Falha ao reusar preapproval existente; criando novo.', e)
      }
    }

    // Cria (ou reaproveita) o registro local e então o preapproval no MP.
    const sub =
      existing ??
      (await prisma.subscription.create({ data: { userId: user.id, status: 'pending' } }))

    const pre = await createPreapproval({
      subscriptionId: sub.id,
      payerEmail: user.email ?? '',
      backUrl,
      amountCents,
    })

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { mpPreapprovalId: pre.mpPreapprovalId, status: 'pending' },
    })

    return NextResponse.json({ success: true, data: { initPoint: pre.initPoint } })
  } catch (error) {
    log.error('Erro em /api/subscriptions/checkout:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao iniciar assinatura.' },
      { status: 500 },
    )
  }
}
