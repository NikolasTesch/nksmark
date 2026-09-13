import { NextResponse } from 'next/server'
import { OrderStatus } from '@prisma/client'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { createRefund, MercadoPagoRefundError } from '@/lib/payments/mercadopago'
import { logger as log } from "@/lib/utils/logger";

// Estorno usa fetch puro sobre o Mercado Pago — runtime Node (não Edge).
export const runtime = 'nodejs'

// Mensagens legíveis para os códigos de erro do Mercado Pago (CA-4/CA-5).
const MP_ERROR_MESSAGES: Record<number, string> = {
  2063: 'O pagamento não está em estado válido para estorno.',
  2024: 'O pagamento é muito antigo para ser estornado.',
  4296: 'Este pagamento já foi estornado anteriormente.',
}

/**
 * Marca o pedido como REFUNDED de forma idempotente (só se ainda PAID).
 * Usado tanto no sucesso imediato do MP quanto no caso 4296 (já estornado).
 */
async function consolidateRefunded(orderId: string, refundId: string | null, adminId: string) {
  await prisma.order.updateMany({
    where: { id: orderId, status: OrderStatus.PAID },
    data: {
      status: OrderStatus.REFUNDED,
      refundPending: false,
      mpRefundId: refundId,
      refundedById: adminId,
      refundedAt: new Date(),
    },
  })
}

/**
 * POST /api/admin/orders/[id]/refund
 *
 * Estorna um pedido PAID via Mercado Pago. `approved` → marca REFUNDED
 * (idempotente via `updateMany status:PAID`); `in_process` → mantém PAID e
 * grava `refundPending`, aguardando o webhook `payment.updated`. Erros do MP
 * (2063/2024/4296) viram respostas 4xx legíveis; 4296 consolida REFUNDED
 * localmente sem duplicar (CA-5).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authStatus = await protectAdminRoute()
  if (!authStatus.authorized) {
    return authStatus.response
  }
  const adminId = authStatus.user.id as string
  const { id } = await params

  try {
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado.' }, { status: 404 })
    }

    // Só estorna pedido PAID com pagamento do MP — senão 409 (CA-4).
    if (order.status !== OrderStatus.PAID || !order.mpPaymentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Apenas pedidos pagos (PAID) com pagamento do Mercado Pago podem ser estornados.',
        },
        { status: 409 },
      )
    }

    const refundResult = await createRefund(order.mpPaymentId)

    // Transição atômica: só marca REFUNDED se ainda estiver PAID (replay
    // idempotente — CA-3). updateMany condicionado protege contra corrida.
    if (refundResult.status === 'approved') {
      await consolidateRefunded(order.id, refundResult.refundId, adminId)
      return NextResponse.json({ ok: true, status: 'refunded', message: 'Estorno concluído.' })
    }

    // Pix/boleto em processamento: mantém PAID, sinaliza pendência p/ webhook.
    await prisma.order.updateMany({
      where: { id: order.id, status: OrderStatus.PAID },
      data: {
        refundPending: true,
        mpRefundId: refundResult.refundId,
        refundedById: adminId,
        refundedAt: new Date(),
      },
    })
    return NextResponse.json({
      ok: true,
      status: 'refund_pending',
      message: 'Estorno em processamento (Pix/boleto). Aguarde a confirmação do Mercado Pago.',
    })
  } catch (error) {
    if (error instanceof MercadoPagoRefundError) {
      // 4296 (já estornado): consolida REFUNDED localmente, sem duplicar (CA-5).
      if (error.causeCodes.includes(4296)) {
        await consolidateRefunded(id, null, adminId)
        return NextResponse.json({
          ok: true,
          status: 'refunded',
          message: 'Pagamento já estava estornado; pedido marcado como estornado.',
        })
      }
      const message =
        error.causeCodes.map((code) => MP_ERROR_MESSAGES[code]).find(Boolean) ||
        'Não foi possível estornar no Mercado Pago.'
      const status = error.status === 404 ? 409 : 400
      return NextResponse.json({ ok: false, status: 'error', message }, { status })
    }
    log.error('Error in admin refund route:', error)
    return NextResponse.json(
      { ok: false, status: 'error', message: 'Erro interno ao processar o estorno.' },
      { status: 500 },
    )
  }
}
