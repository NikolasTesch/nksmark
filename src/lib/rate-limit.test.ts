import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { rateLimit, __resetRateLimitStore } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    __resetRateLimitStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('permite requisições dentro do limite e decrementa remaining', () => {
    const a = rateLimit('k', 3, 1000)
    expect(a.success).toBe(true)
    expect(a.remaining).toBe(2)

    const b = rateLimit('k', 3, 1000)
    expect(b.success).toBe(true)
    expect(b.remaining).toBe(1)
  })

  it('bloqueia ao exceder o limite na mesma janela', () => {
    rateLimit('k', 2, 1000)
    rateLimit('k', 2, 1000)
    const blocked = rateLimit('k', 2, 1000)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('reinicia a contagem após a janela expirar', () => {
    rateLimit('k', 1, 1000)
    expect(rateLimit('k', 1, 1000).success).toBe(false)

    vi.advanceTimersByTime(1001)

    const afterReset = rateLimit('k', 1, 1000)
    expect(afterReset.success).toBe(true)
  })

  it('isola limites por chave', () => {
    rateLimit('a', 1, 1000)
    expect(rateLimit('a', 1, 1000).success).toBe(false)
    expect(rateLimit('b', 1, 1000).success).toBe(true)
  })
})
