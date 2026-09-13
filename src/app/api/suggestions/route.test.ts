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
import { uploadFileToR2 } from '@/lib/r2/upload'
import { resend } from '@/lib/email/resend'

function multipartReq(fields: Record<string, string>, file?: { name: string; type: string; bytes: number }) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  if (file) fd.append('image', new File([new Uint8Array(file.bytes)], file.name, { type: file.type }))
  return new Request('http://localhost/api/suggestions', { method: 'POST', body: fd })
}

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

describe('POST /api/suggestions — validações de e-mail', () => {
  it('aceita e-mail nulo', async () => {
    const res = await POST(jsonReq({ ...validBody, email: null }))
    expect(res.status).toBe(201)
  })

  it('aceita e-mail vazio', async () => {
    const res = await POST(jsonReq({ ...validBody, email: '' }))
    expect(res.status).toBe(201)
  })

  it('aceita sem o campo e-mail', async () => {
    const { email, ...bodyWithoutEmail } = validBody
    const res = await POST(jsonReq(bodyWithoutEmail))
    expect(res.status).toBe(201)
  })

  it('rejeita e-mail inválido', async () => {
    const res = await POST(jsonReq({ ...validBody, email: 'invalido' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe('Email inválido')
  })
})

describe('POST /api/suggestions — multipart/form-data', () => {
  it('faz upload de imagem válida e retorna 201', async () => {
    vi.mocked(uploadFileToR2).mockResolvedValue({ url: 'https://r2/x.png', key: 'previews/x.png', size: 100 })
    prismaMock.suggestion.create.mockResolvedValue({ id: 'sug-1', imageUrl: 'https://r2/x.png' })
    const res = await POST(
      multipartReq(
        { email: 'a@b.com', description: 'Queria uma arte de gato astronauta' },
        { name: 'x.png', type: 'image/png', bytes: 100 }
      )
    )
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.imageUrl).toBe('https://r2/x.png')
    expect(vi.mocked(uploadFileToR2)).toHaveBeenCalled()
    expect(prismaMock.suggestion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ imageUrl: 'https://r2/x.png' }) })
    )
  })

  it('rejeita tipo de imagem inválido com 400', async () => {
    const res = await POST(
      multipartReq(
        { description: 'Queria uma arte de gato astronauta' },
        { name: 'x.svg', type: 'image/svg+xml', bytes: 100 }
      )
    )
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/Formato de imagem inválido/)
  })

  it('rejeita imagem acima de 5 MB com 400', async () => {
    const res = await POST(
      multipartReq(
        { description: 'Queria uma arte de gato astronauta' },
        { name: 'x.png', type: 'image/png', bytes: 6 * 1024 * 1024 }
      )
    )
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/no máximo 5 MB/)
  })

  it('aceita formulário sem imagem', async () => {
    const res = await POST(multipartReq({ email: 'a@b.com', description: 'Queria uma arte de gato astronauta' }))
    expect(res.status).toBe(201)
    expect(vi.mocked(uploadFileToR2)).not.toHaveBeenCalled()
  })
})

describe('POST /api/suggestions — erro interno', () => {
  it('retorna 500 quando o banco falha', async () => {
    prismaMock.suggestion.create.mockRejectedValue(new Error('db'))
    const res = await POST(jsonReq(validBody))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Erro interno no servidor')
  })
})

describe('POST /api/suggestions — notificação por e-mail', () => {
  it('envia e-mail para o admin quando RESEND_API_KEY está configurado', async () => {
    process.env.RESEND_API_KEY = 're_test'
    const res = await POST(jsonReq(validBody))
    expect(res.status).toBe(201)
    expect(vi.mocked(resend.emails.send)).toHaveBeenCalled()
  })
})

