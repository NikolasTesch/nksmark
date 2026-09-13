import { NextResponse } from 'next/server'
import { reconcileSubscription } from '@/lib/payments/preapproval'
import { logger as log } from '@/lib/utils/logger'

export const runtime = 'nodejs'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Rota de retorno do checkout do Mercado Pago (`back_url`).
 *
 * O MP devolve o `preapproval_id` na query — MAS NUNCA confiamos no
 * `status` da query para definir o estado local. Sempre consolidamos via
 * `GET /preapproval/{id}` (idempotente) e só então redirecionamos para a
 * página /assinatura com o estado real. Se faltar o id, redireciona direto.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const preapprovalId = url.searchParams.get('preapproval_id')

  if (preapprovalId) {
    try {
      await reconcileSubscription(preapprovalId)
    } catch (error) {
      // Erro de consolidação não deve travar o retorno; a página mostra o
      // estado atual e o webhook/Mercado Pago reconsiliará em seguida.
      log.error('Falha ao consolidar assinatura no retorno:', error)
    }
  }

  return NextResponse.redirect(`${appUrl()}/assinatura`)
}
