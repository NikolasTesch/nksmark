import { NextResponse } from 'next/server'
import * as React from 'react'
import { OrderStatus } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getPayment, verifyWebhookSignature } from '@/lib/payments/mercadopago'
import { reconcileSubscription } from '@/lib/payments/preapproval'
import { resend, EMAIL_FROM } from '@/lib/email/resend'
import { PaymentConfirmedEmailTemplate } from '@/lib/email/templates/payment-confirmed'
import { formatBRL } from '@/lib/utils/format'
import { logger as log } from "@/lib/utils/logger";

export const runtime = 'nodejs'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Webhook do Mercado Pago. Confirma pagamentos de forma autoritativa.
 *
 * Endpoint público, mas protegido por validação de assinatura (`x-signature`).
 * Casos benignos (já processado, não-pagamento, pedido desconhecido, valor
 * divergente) respondem 200 para o Mercado Pago não reentregar. Falhas reais
 * de processamento (API do MP ou banco caiu) respondem 502 para disparar retry.
 * Assinatura inválida é o único caso 401.
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')

    // `data.id` e `type` podem vir na query string e/ou no corpo.
    let dataId = url.searchParams.get('data.id')
    let type = url.searchParams.get('type') || url.searchParams.get('topic')

    let body: { type?: string; action?: string; data?: { id?: string } } = {}
    try {
      body = await req.json()
    } catch {
      // Notificações podem chegar sem corpo JSON — tudo bem.
    }
    if (!dataId && body.data?.id) dataId = String(body.data.id)
    if (!type && body.type) type = body.type

    // Assinatura inválida é o único caso que rejeitamos explicitamente.
    if (!verifyWebhookSignature(xSignature, xRequestId, dataId, process.env.MP_WEBHOOK_SECRET)) {
      return NextResponse.json({ success: false, error: 'Assinatura inválida.' }, { status: 401 })
    }

    // Mudança de status da assinatura (subscription_preapproval). Consolidamos
    // o estado local via GET /preapproval/{id} (idempotente).
    if (type === 'subscription_preapproval' && dataId) {
      try {
        await reconcileSubscription(dataId)
        return NextResponse.json({ success: true })
      } catch (processingError) {
        log.error('Processing error in subscription webhook (retryable):', processingError)
        return NextResponse.json({ success: false, error: 'Processing failure.' }, { status: 502 })
      }
    }

    // Só tratamos eventos de pagamento.
    if (type !== 'payment' || !dataId) {
      return NextResponse.json({ success: true })
    }

    // Caminho de processamento: falhas aqui são reais e devem acionar retry.
    try {
      const payment = await getPayment(dataId)

      // Pagamento de recorrência: traz `subscription_id` (id do preapproval no
      // MP). Não está ligado a um Order — reconsilia a assinatura (status +
      // currentPeriodEnd) e encerra. Renovações duplicadas são idempotentes por
      // construção (reconcile recalcula a partir do MP).
      if (payment.subscriptionId) {
        try {
          await reconcileSubscription(payment.subscriptionId)
          return NextResponse.json({ success: true })
        } catch (processingError) {
          log.error('Processing error in subscription payment webhook (retryable):', processingError)
          return NextResponse.json({ success: false, error: 'Processing failure.' }, { status: 502 })
        }
      }

      const orderId = payment.externalReference
      if (!orderId) {
        return NextResponse.json({ success: true })
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          artwork: { select: { title: true } },
          items: { select: { artwork: { select: { title: true } } } },
          user: { select: { email: true, name: true } },
        },
      })
      if (!order) {
        return NextResponse.json({ success: true })
      }

      // Estorno confirmado via webhook (payment.updated com status "refunded" —
      // não há tópico dedicado de refund). Consolida REFUNDED se ainda PAID; o
      // `updateMany status:PAID` protege contra corrida com o endpoint admin
      // (CA-2/CA-3). Vai ANTES do atalho de idempotência abaixo, que ignoraria
      // um pedido PAID recém-estornado.
      if (payment.status === 'refunded') {
        if (order.status === OrderStatus.PAID) {
          await prisma.order.updateMany({
            where: { id: order.id, status: OrderStatus.PAID },
            data: {
              status: OrderStatus.REFUNDED,
              refundPending: false,
              refundedAt: order.refundedAt ?? new Date(),
            },
          })
        }
        return NextResponse.json({ success: true })
      }

      // Idempotência: evento já processado (mesmo pagamento ou pedido já pago).
      if (order.status === OrderStatus.PAID || order.mpPaymentId) {
        return NextResponse.json({ success: true })
      }

      if (payment.status === 'approved') {
        // Confere o valor: o pagamento aprovado deve bater com o pedido.
        const expectedAmount = order.amountCents
        const paidAmount = Math.round((payment.transactionAmount ?? 0) * 100)
        if (paidAmount !== expectedAmount) {
          log.error('Payment amount mismatch', { orderId, expectedAmount, paidAmount })
          return NextResponse.json({ success: true })
        }

        // Transição atômica: só marca PAID se ainda estiver PENDING. count === 0
        // significa que outro evento já finalizou o pedido → sucesso idempotente.
        const updateMeta = await prisma.order.updateMany({
          where: { id: order.id, status: OrderStatus.PENDING },
          data: {
            status: OrderStatus.PAID,
            mpPaymentId: String(payment.id),
            paymentMethod: payment.paymentTypeId,
            paidAt: new Date(),
          },
        })
        if (updateMeta.count === 0) {
          return NextResponse.json({ success: true })
        }

        // E-mail de confirmação — falha de envio não desfaz o pagamento.
        if (
          order.user.email &&
          process.env.RESEND_API_KEY &&
          process.env.RESEND_API_KEY !== 're_placeholder'
        ) {
          try {
            const { error } = await resend.emails.send({
              from: EMAIL_FROM,
              to: order.user.email,
              subject: 'Pagamento confirmado — NKS Art',
              react: React.createElement(PaymentConfirmedEmailTemplate, {
                customerName: order.user.name,
                artworkTitle: order.artwork?.title ?? order.items[0]?.artwork.title ?? 'Arte',
                amountFormatted: formatBRL(order.amountCents),
                downloadsUrl: `${appUrl()}/minhas-compras`,
              }),
            })
            if (error) log.error('Error sending payment email:', error)
          } catch (err) {
            log.error('Unexpected error sending payment email:', err)
          }
        }
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        // Igualmente atômico: só marca FAILED se ainda estiver PENDING.
        await prisma.order.updateMany({
          where: { id: order.id, status: OrderStatus.PENDING },
          data: { status: OrderStatus.FAILED, mpPaymentId: String(payment.id) },
        })
      }
      // 'pending'/'in_process' → não muda nada; aguardamos nova notificação.

      return NextResponse.json({ success: true })
    } catch (processingError) {
      log.error('Processing error in payments webhook (retryable):', processingError)
      // 502 faz o Mercado Pago reentregar; erro de processamento não é benigno.
      return NextResponse.json({ success: false, error: 'Processing failure.' }, { status: 502 })
    }
  } catch (error) {
    log.error('Error in payments webhook:', error)
    // Erro inesperado fora do caminho de processamento (ex.: parsing) — mantém 200.
    return NextResponse.json({ success: true })
  }
}
