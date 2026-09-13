import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import prisma from '@/lib/prisma'
import { cancelPreapproval } from '@/lib/payments/preapproval'
import { logger as log } from '@/lib/utils/logger'

export const runtime = 'nodejs'

/**
 * Cancela a assinatura local espelhando no Mercado Pago (`PUT /preapproval/{id}`
 * status=cancelled). Sem reembolso do ciclo vigente (ADR-2). Usa `updateMany`
 * condicionado por `mpPreapprovalId` para proteger contra corrida.
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as { id?: string } | undefined
    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: 'Faça login para gerenciar sua assinatura.' },
        { status: 401 },
      )
    }

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } })
    if (!sub || !sub.mpPreapprovalId) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma assinatura ativa para cancelar.' },
        { status: 404 },
      )
    }

    const pre = await cancelPreapproval(sub.mpPreapprovalId)

    await prisma.subscription.updateMany({
      where: { id: sub.id, mpPreapprovalId: sub.mpPreapprovalId },
      data: { status: pre.status },
    })

    return NextResponse.json({ success: true, data: { status: pre.status } })
  } catch (error) {
    log.error('Erro em /api/subscriptions/me/cancel:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao cancelar assinatura.' },
      { status: 500 },
    )
  }
}
