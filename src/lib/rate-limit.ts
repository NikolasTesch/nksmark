import { headers } from 'next/headers'

/**
 * Rate limiter de janela fixa, em memória do processo.
 *
 * Sem dependências externas (Redis/Upstash). É suficiente para um catálogo
 * interno e protege contra brute-force/abuso *online* de um mesmo cliente.
 *
 * Limitação conhecida: em ambientes serverless com múltiplas instâncias
 * (ex.: Vercel) cada instância tem seu próprio mapa, então o limite efetivo
 * é por instância. Para um limite global e durável, trocar o `store` por
 * Upstash Redis (`@upstash/ratelimit`). A interface abaixo foi mantida
 * compatível com essa futura migração.
 */

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

// Limpeza preguiçosa: a cada N chamadas remove buckets expirados para a
// memória não crescer indefinidamente com chaves antigas (ex.: muitos IPs).
let opsSinceSweep = 0
const SWEEP_EVERY = 500

function sweep(now: number): void {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}

export interface RateLimitResult {
  /** `true` se a requisição está dentro do limite. */
  success: boolean
  /** Requisições restantes na janela atual. */
  remaining: number
  /** Epoch (ms) em que a janela reinicia. */
  resetAt: number
  /** Segundos até o reset — útil para o header `Retry-After`. */
  retryAfter: number
}

/**
 * Consome uma unidade do limite para `key`.
 *
 * @param key    Identificador do cliente (ex.: `login:<ip>`, `download:<userId>`).
 * @param limit  Máximo de requisições permitidas na janela.
 * @param windowMs Tamanho da janela em milissegundos.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  if (++opsSinceSweep >= SWEEP_EVERY) {
    opsSinceSweep = 0
    sweep(now)
  }

  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  bucket.count += 1
  return {
    success: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
    retryAfter: 0,
  }
}

/** Apenas para testes: limpa o estado interno. */
export function __resetRateLimitStore(): void {
  store.clear()
  opsSinceSweep = 0
}

/**
 * Extrai o IP do cliente a partir dos headers da requisição.
 * Em produção atrás de proxy/CDN usa `x-forwarded-for` (primeiro IP da lista).
 * Cai para `x-real-ip` e, por fim, um marcador `unknown`.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers()
    const forwarded = h.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0]!.trim()
    }
    return h.get('x-real-ip')?.trim() || 'unknown'
  } catch {
    // `headers()` lança fora de um escopo de requisição (ex.: testes). Sem IP,
    // o rate limit recai sobre a chave por e-mail, que continua válida.
    return 'unknown'
  }
}
