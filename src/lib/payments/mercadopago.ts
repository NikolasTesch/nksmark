import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { logger as log } from "@/lib/utils/logger";

/**
 * Cliente fino do Mercado Pago via REST (fetch) — sem dependência de SDK.
 *
 * O SDK oficial é apenas um wrapper sobre estes mesmos endpoints; usar `fetch`
 * direto mantém o projeto sem mais uma dependência (mesma escolha de scrypt no
 * lugar de bcrypt) e torna trivial mockar `fetch` nos testes.
 *
 * Roda apenas no runtime Node (route handlers) — NUNCA no Edge/middleware,
 * pois usa `crypto`.
 */

const MP_API_BASE = 'https://api.mercadopago.com'

export function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN não configurado no ambiente.')
  }
  const cleanToken = token.trim().replace(/^["']|["']$/g, '')
  return cleanToken
}

export interface CreatePreferenceInput {
  /** Referência interna do pedido — volta no webhook como `external_reference`. */
  orderId: string
  /** Itens do pedido para exibição no checkout do Mercado Pago. */
  items: { id: string; title: string; unitPrice: number; quantity: number }[]
  /** E-mail do comprador, exibido no checkout. */
  payerEmail: string
  successUrl: string
  pendingUrl: string
  failureUrl: string
  notificationUrl: string
}

export interface CreatePreferenceResult {
  preferenceId: string
  /** URL para redirecionar o cliente ao checkout do Mercado Pago. */
  initPoint: string
}

export async function createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
  const body = {
    items: input.items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      currency_id: 'BRL',
      unit_price: item.unitPrice,
    })),
    payer: { email: input.payerEmail },
    external_reference: input.orderId,
    back_urls: {
      success: input.successUrl,
      pending: input.pendingUrl,
      failure: input.failureUrl,
    },
    auto_return: 'approved',
    notification_url: input.notificationUrl,
  }

  const res = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    log.error(`[Mercado Pago Error] Falha ao criar preference (${res.status}):`, detail, 'Body enviado:', JSON.stringify(body))
    throw new Error(`Falha ao criar preference no Mercado Pago (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as { id?: string; init_point?: string; sandbox_init_point?: string }
  const initPoint = data.init_point || data.sandbox_init_point
  if (!data.id || !initPoint) {
    throw new Error('Resposta inválida do Mercado Pago ao criar preference.')
  }

  return { preferenceId: data.id, initPoint }
}

export interface MercadoPagoPayment {
  id: number
  status: string // approved | pending | rejected | cancelled | refunded ...
  externalReference: string | null
  transactionAmount: number | null
  paymentMethodId: string | null
  paymentTypeId: string | null
  /** Preenchido em pagamentos de assinatura recorrente (id do preapproval no MP). */
  subscriptionId: string | null
}

export async function getPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const res = await fetch(`${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Falha ao consultar pagamento no Mercado Pago (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as {
    id: number
    status: string
    external_reference: string | null
    transaction_amount: number | null
    payment_method_id: string | null
    payment_type_id: string | null
    subscription_id: string | null
  }

  return {
    id: data.id,
    status: data.status,
    externalReference: data.external_reference,
    transactionAmount: data.transaction_amount,
    paymentMethodId: data.payment_method_id,
    paymentTypeId: data.payment_type_id,
    subscriptionId: data.subscription_id,
  }
}

/**
 * Erro lançado por `createRefund` quando o Mercado Pago responde com status
 * não-2xx. Carrega o status HTTP e os códigos `cause` da API (ex.: 2063,
 * 2024, 4296) para o chamador mapear mensagens legíveis sem re-parsear.
 */
export class MercadoPagoRefundError extends Error {
  constructor(
    public status: number,
    public causeCodes: number[],
    public raw: string,
  ) {
    super(`Falha ao estornar no Mercado Pago (${status}).`)
    this.name = 'MercadoPagoRefundError'
  }
}

export interface CreateRefundOptions {
  /** Valor parcial em BRL. Omitir = estorno total. */
  amount?: number
  /** Chave de idempotência; gerada via UUID quando ausente. */
  idempotencyKey?: string
}

export interface CreateRefundResult {
  refundId: string
  status: string // approved | in_process | ...
}

/**
 * Solicita estorno total/parcial de um pagamento no Mercado Pago.
 *
 * `POST /v1/payments/{id}/refunds` com `X-Idempotency-Key` (sempre) e
 * `X-Render-In-Process-Refunds: true` (Pix pode responder `201 in_process`
 * em vez de 400). Timeout de 10s (RFN-2) — sem retry automático, a idempotency
 * key protege retry manual. Sem SDK npm (RFN-3), como o resto da camada.
 */
export async function createRefund(
  paymentId: string,
  opts: CreateRefundOptions = {},
): Promise<CreateRefundResult> {
  const idempotencyKey = opts.idempotencyKey || randomUUID()
  const body = opts.amount != null ? { amount: opts.amount } : {}

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  let res: Response
  try {
    res = await fetch(`${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
        'X-Render-In-Process-Refunds': 'true',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    const causeCodes: number[] = []
    try {
      const parsed = JSON.parse(raw) as { cause?: { code?: number }[] }
      if (Array.isArray(parsed.cause)) {
        for (const c of parsed.cause) {
          if (typeof c.code === 'number') causeCodes.push(c.code)
        }
      }
    } catch {
      // Corpo não-JSON: mantém causeCodes vazio e repassa o raw.
    }
    throw new MercadoPagoRefundError(res.status, causeCodes, raw)
  }

  const data = (await res.json()) as { id?: number | string; status?: string }
  if (data.id == null) {
    throw new Error('Resposta inválida do Mercado Pago ao estornar.')
  }

  return { refundId: String(data.id), status: data.status ?? '' }
}

/**
 * Valida a assinatura `x-signature` enviada pelo Mercado Pago nos webhooks.
 *
 * O header tem o formato `ts=<timestamp>,v1=<hash>`. O manifesto assinado é
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` e o hash é HMAC-SHA256 com
 * `MP_WEBHOOK_SECRET`. Ver docs: https://www.mercadopago.com/developers (Webhooks).
 *
 * @param signatureHeader valor de `x-signature`
 * @param requestId       valor de `x-request-id`
 * @param dataId          `data.id` recebido na query string da notificação
 * @param secret          segredo configurado no painel do Mercado Pago
 */
export function verifyWebhookSignature(
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string | null,
  secret: string | undefined,
): boolean {
  if (!signatureHeader) {
    log.error('[MP Webhook] signatureHeader is null or empty')
    return false
  }
  
  const cleanSecret = secret ? secret.trim().replace(/^["']|["']$/g, '') : ''
  if (!cleanSecret) {
    log.error('[MP Webhook] secret (MP_WEBHOOK_SECRET) is undefined or empty')
    return false
  }
  if (!dataId) {
    log.error('[MP Webhook] dataId is null or empty')
    return false
  }

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, rawValue] = part.split('=')
    if (rawKey && rawValue) acc[rawKey.trim()] = rawValue.trim()
    return acc
  }, {})

  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) {
    log.error('[MP Webhook] ts or v1 missing in signatureHeader:', signatureHeader)
    return false
  }

  // O Mercado Pago usa o id em minúsculas quando alfanumérico.
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId ?? ''};ts:${ts};`
  const expected = createHmac('sha256', cleanSecret).update(manifest).digest('hex')

  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(v1, 'hex')
  
  if (expectedBuf.length !== receivedBuf.length) {
    log.error('[MP Webhook] Signature length mismatch:', { expectedLength: expectedBuf.length, receivedLength: receivedBuf.length })
    return false
  }
  
  const match = timingSafeEqual(expectedBuf, receivedBuf)
  if (!match) {
    log.error('[MP Webhook] Signature mismatch.', {
      manifest,
      expectedHash: expected,
      receivedHash: v1,
      secretLength: cleanSecret.length,
      secretHint: cleanSecret.length > 8 ? `${cleanSecret.substring(0, 4)}...${cleanSecret.substring(cleanSecret.length - 4)}` : 'too short'
    })
  }
  return match
}
