import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { verifyWebhookSignature } from './mercadopago'

const SECRET = 'webhook-secret-123'

function signedHeader(dataId: string, requestId: string, ts: string, secret = SECRET): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex')
  return `ts=${ts},v1=${v1}`
}

describe('verifyWebhookSignature', () => {
  it('aceita uma assinatura válida', () => {
    const header = signedHeader('123456', 'req-abc', '1700000000')
    expect(verifyWebhookSignature(header, 'req-abc', '123456', SECRET)).toBe(true)
  })

  it('normaliza o data.id para minúsculas (igual ao Mercado Pago)', () => {
    const header = signedHeader('ABCDEF', 'req-1', '1700000000')
    expect(verifyWebhookSignature(header, 'req-1', 'ABCDEF', SECRET)).toBe(true)
  })

  it('rejeita assinatura com hash adulterado', () => {
    const header = signedHeader('123456', 'req-abc', '1700000000')
    const tampered = header.replace(/v1=.*/, 'v1=deadbeef')
    expect(verifyWebhookSignature(tampered, 'req-abc', '123456', SECRET)).toBe(false)
  })

  it('rejeita quando o segredo é diferente', () => {
    const header = signedHeader('123456', 'req-abc', '1700000000', 'outro-segredo')
    expect(verifyWebhookSignature(header, 'req-abc', '123456', SECRET)).toBe(false)
  })

  it('rejeita header/secret/dataId ausentes', () => {
    expect(verifyWebhookSignature(null, 'req', '1', SECRET)).toBe(false)
    expect(verifyWebhookSignature('ts=1,v1=abc', 'req', '1', undefined)).toBe(false)
    expect(verifyWebhookSignature('ts=1,v1=abc', 'req', null, SECRET)).toBe(false)
  })

  it('rejeita header malformado (sem ts/v1)', () => {
    expect(verifyWebhookSignature('garbage', 'req', '123', SECRET)).toBe(false)
  })
})
