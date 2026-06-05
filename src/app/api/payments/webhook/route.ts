import { NextResponse } from 'next/server'
import * as React from 'react'
import { OrderStatus } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getPayment, verifyWebhookSignature } from '@/lib/payments/mercadopago'
import { resend, EMAIL_FROM } from '@/lib/email/resend'
import { PaymentConfirmedEmailTemplate } from '@/lib/email/templates/payment-confirmed'
import { formatBRL } from '@/lib/utils/format'

export const runtime = 'nodejs'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Webhook do Mercado Pago. Confirma pagamentos de forma autoritativa.
 *
 * Endpoint público, mas protegido por validação de assinatura (`x-signature`).
 * Sempre responde 200 rápido (mesmo em erros previsíveis) para o Mercado Pago
 * não reentregar em cascata; só responde 401 para assinatura inválida.
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

    // Só tratamos eventos de pagamento.
    if (type !== 'payment' || !dataId) {
      return NextResponse.json({ success: true })
    }

    const payment = await getPayment(dataId)
    const orderId = payment.externalReference
    if (!orderId) {
      return NextResponse.json({ success: true })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { artwork: { select: { title: true } }, user: { select: { email: true, name: true } } },
    })
    if (!order) {
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
        console.error('Payment amount mismatch', { orderId, expectedAmount, paidAmount })
        return NextResponse.json({ success: true })
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          mpPaymentId: String(payment.id),
          paymentMethod: payment.paymentTypeId,
          paidAt: new Date(),
        },
      })

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
              artworkTitle: order.artwork.title,
              amountFormatted: formatBRL(order.amountCents),
              downloadsUrl: `${appUrl()}/minhas-compras`,
            }),
          })
          if (error) console.error('Error sending payment email:', error)
        } catch (err) {
          console.error('Unexpected error sending payment email:', err)
        }
      }
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED, mpPaymentId: String(payment.id) },
      })
    }
    // 'pending'/'in_process' → não muda nada; aguardamos nova notificação.

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in payments webhook:', error)
    // Responde 200 para o Mercado Pago não reentregar infinitamente em erro nosso.
    return NextResponse.json({ success: true })
  }
}
