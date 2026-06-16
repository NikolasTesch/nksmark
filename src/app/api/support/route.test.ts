import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, clientIp } = vi.hoisted(() => ({
  prismaMock: {
    supportTicket: {
      create: vi.fn(),
    },
  },
  clientIp: { value: '203.0.113.1' },
}))

vi.mock('@/lib/prisma', () => ({ default: prismaMock }))
vi.mock('@/lib/email/resend', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null }),
    },
  },
  EMAIL_FROM: 'no-reply@test',
}))
vi.mock('@/lib/email/templates/support', () => ({ SupportEmailTemplate: () => null }))
vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>()
  return { ...actual, getClientIp: () => Promise.resolve(clientIp.value) }
})

import { POST } from './route'
import { __resetRateLimitStore } from '@/lib/rate-limit'

function jsonReq(body: unknown) {
  return new Request('http://localhost/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = { name: 'João Silva', email: 'joao@example.com', message: 'Estou com erro ao abrir o arquivo CDR' }

beforeEach(() => {
  vi.clearAllMocks()
  __resetRateLimitStore()
  process.env.RESEND_API_KEY = 're_testkey'
  prismaMock.supportTicket.create.mockResolvedValue({ id: 'ticket-1' })
})


describe('POST /api/support — validation and email sending', () => {
  it('envia email com sucesso se os campos forem válidos', async () => {
    const res = await POST(jsonReq(validBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('retorna 400 se faltar o nome', async () => {
    const res = await POST(jsonReq({ ...validBody, name: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain('Nome')
  })

  it('retorna 400 se o email for inválido', async () => {
    const res = await POST(jsonReq({ ...validBody, email: 'notanemail' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain('Email')
  })

  it('retorna 400 se a mensagem for menor que 10 caracteres', async () => {
    const res = await POST(jsonReq({ ...validBody, message: 'curta' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain('mensagem')
  })
})

describe('POST /api/support — rate limit', () => {
  it('aceita as primeiras 3 requisições do mesmo IP em 1 minuto', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await POST(jsonReq(validBody))
      expect(res.status).toBe(200)
    }
  })

  it('bloqueia a 4ª requisição do mesmo IP com 429', async () => {
    for (let i = 0; i < 3; i++) await POST(jsonReq(validBody))

    const res = await POST(jsonReq(validBody))
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.success).toBe(false)
    expect(res.headers.get('Retry-After')).toBeTruthy()
  })
})
