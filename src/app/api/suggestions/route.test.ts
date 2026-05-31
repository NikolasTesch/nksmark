import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mocka dependências externas, mas usa o rateLimit REAL (estado em memória) para
// validar de ponta a ponta o bloqueio do endpoint público.
const { prismaMock, clientIp } = vi.hoisted(() => ({
  prismaMock: {
    suggestion: { create: vi.fn() },
  },
  clientIp: { value: '203.0.113.1' },
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/email/resend', () => ({ resend: { emails: { send: vi.fn() } }, EMAIL_FROM: 'no-reply@test' }))
vi.mock('@/lib/email/templates/suggestion', () => ({ SuggestionEmailTemplate: () => null }))
vi.mock('@/lib/r2/upload', () => ({ uploadFileToR2: vi.fn() }))
// getClientIp é mockado para um IP fixo; rateLimit continua o real.
vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>()
  return { ...actual, getClientIp: () => Promise.resolve(clientIp.value) }
})

import { POST } from './route'
import { __resetRateLimitStore } from '@/lib/rate-limit'

function jsonReq(body: unknown) {
  return new Request('http://localhost/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = { email: 'cliente@example.com', description: 'Queria uma arte de gato astronauta para camiseta' }

beforeEach(() => {
  vi.clearAllMocks()
  __resetRateLimitStore()
  delete process.env.RESEND_API_KEY
  prismaMock.suggestion.create.mockResolvedValue({ id: 'sug-1' })
})

describe('POST /api/suggestions — rate limit', () => {
  it('aceita as primeiras 5 sugestões do mesmo IP em 1 minuto', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await POST(jsonReq(validBody))
      expect(res.status).toBe(201)
    }
    expect(prismaMock.suggestion.create).toHaveBeenCalledTimes(5)
  })

  it('bloqueia a 6ª sugestão do mesmo IP com 429 e Retry-After', async () => {
    for (let i = 0; i < 5; i++) await POST(jsonReq(validBody))

    const res = await POST(jsonReq(validBody))
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.success).toBe(false)
    expect(res.headers.get('Retry-After')).toBeTruthy()
    // não deve ter persistido a sugestão bloqueada
    expect(prismaMock.suggestion.create).toHaveBeenCalledTimes(5)
  })

  it('mantém o limite por IP — outro IP continua liberado', async () => {
    for (let i = 0; i < 5; i++) await POST(jsonReq(validBody))
    expect((await POST(jsonReq(validBody))).status).toBe(429)

    clientIp.value = '198.51.100.7'
    expect((await POST(jsonReq(validBody))).status).toBe(201)
  })
})
