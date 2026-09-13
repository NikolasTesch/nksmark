import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import prisma from '@/lib/prisma'
import { logger as log } from '@/lib/utils/logger'

export const runtime = 'nodejs'

function planInfo() {
  const amountCents = parseInt(process.env.MP_ACERVO_AMOUNT_CENTS || '2990', 10)
  return { amountCents, currency: 'BRL', interval: 'month' }
}

/**
 * Estado da assinatura do acervo para o usuário logado.
 * Retorna `data: null` quando ele ainda não tem assinatura.
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string } | undefined
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para ver sua assinatura.' },
        { status: 401 },
      )
    }

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } })

    if (!sub) {
      return NextResponse.json({ success: true, data: { subscription: null, plan: planInfo() } })
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
          createdAt: sub.createdAt.toISOString(),
        },
        plan: planInfo(),
      },
    })
  } catch (error) {
    log.error('Erro em /api/subscriptions/me:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar assinatura.' },
      { status: 500 },
    )
  }
}
