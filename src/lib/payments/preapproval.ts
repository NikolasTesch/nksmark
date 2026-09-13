import { logger as log } from '@/lib/utils/logger'
import prisma from '@/lib/prisma'
import { getAccessToken } from './mercadopago'

/**
 * Cliente fino do Mercado Pago para assinaturas recorrentes (Preapproval),
 * no mesmo estilo de `mercadopago.ts`: REST via fetch puro, sem SDK npm.
 *
 * Criamos o preapproval inline (auto_recurring no corpo) — dispensa um
 * `preapproval_plan` pré-cadastrado no painel (ADR-2). O `init_point` retornado
 * é o checkout hospedado do MP para onde redirecionamos o cliente.
 */

const MP_API_BASE = 'https://api.mercadopago.com'

export interface CreatePreapprovalInput {
  /** `external_reference` — id da assinatura local (não o userId). */
  subscriptionId: string
  payerEmail: string
  backUrl: string
  /** Valor mensal em centavos (ex.: 2990 = R$ 29,90). */
  amountCents: number
  frequency?: number
  frequencyType?: string
  reason?: string
}

export interface CreatePreapprovalResult {
  mpPreapprovalId: string
  initPoint: string
}

export interface Preapproval {
  id: string
  status: string // 'pending'|'authorized'|'paused'|'cancelled'
  initPoint: string | null
  nextPaymentDate: string | null
}

export async function createPreapproval(input: CreatePreapprovalInput): Promise<CreatePreapprovalResult> {
  const body = {
    reason: input.reason ?? 'Acervo NKS — assinatura mensal',
    external_reference: input.subscriptionId,
    payer_email: input.payerEmail,
    back_url: input.backUrl,
    auto_recurring: {
      frequency: input.frequency ?? 1,
      frequency_type: input.frequencyType ?? 'months',
      transaction_amount: input.amountCents / 100,
      currency_id: 'BRL',
    },
  }

  const res = await fetch(`${MP_API_BASE}/preapproval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    log.error(`[Mercado Pago Error] Falha ao criar preapproval (${res.status}):`, detail)
    throw new Error(`Falha ao criar assinatura no Mercado Pago (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as { id?: string; init_point?: string; sandbox_init_point?: string }
  const initPoint = data.init_point || data.sandbox_init_point
  if (!data.id || !initPoint) {
    throw new Error('Resposta inválida do Mercado Pago ao criar assinatura.')
  }

  return { mpPreapprovalId: data.id, initPoint }
}

export async function getPreapproval(preapprovalId: string): Promise<Preapproval> {
  const res = await fetch(`${MP_API_BASE}/preapproval/${encodeURIComponent(preapprovalId)}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Falha ao consultar assinatura no Mercado Pago (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as {
    id: string
    status: string
    init_point?: string
    sandbox_init_point?: string
    next_payment_date?: string | null
  }

  return {
    id: data.id,
    status: data.status,
    initPoint: data.init_point || data.sandbox_init_point || null,
    nextPaymentDate: data.next_payment_date ?? null,
  }
}

export async function cancelPreapproval(preapprovalId: string): Promise<Preapproval> {
  const res = await fetch(`${MP_API_BASE}/preapproval/${encodeURIComponent(preapprovalId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Falha ao cancelar assinatura no Mercado Pago (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as {
    id: string
    status: string
    init_point?: string
    sandbox_init_point?: string
    next_payment_date?: string | null
  }

  return {
    id: data.id,
    status: data.status,
    initPoint: data.init_point || data.sandbox_init_point || null,
    nextPaymentDate: data.next_payment_date ?? null,
  }
}

/**
 * Espelha o estado autoritativo do MP na assinatura local. Idempotente por
 * construção: o `currentPeriodEnd` é sempre recalculado a partir do
 * `next_payment_date` do MP, então eventos duplicados (mesmo payment id) não
 * avançam o ciclo mais de uma vez (CA-2). Usado pelo webhook (tanto
 * `subscription_preapproval` quanto `payment` com `subscription_id`) e pelo
 * retorno do checkout. `updateMany` protege contra corrida.
 */
export async function reconcileSubscription(mpPreapprovalId: string): Promise<void> {
  const preapproval = await getPreapproval(mpPreapprovalId)
  await prisma.subscription.updateMany({
    where: { mpPreapprovalId },
    data: {
      status: preapproval.status,
      currentPeriodEnd: preapproval.nextPaymentDate ? new Date(preapproval.nextPaymentDate) : null,
    },
  })
}
