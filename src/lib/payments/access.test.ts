import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Role } from '@prisma/client'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { order: { findFirst: vi.fn() } },
}))
vi.mock('@/lib/prisma', () => ({ default: prismaMock }))

import { canDownloadArtwork } from './access'

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.order.findFirst.mockResolvedValue(null)
})

describe('canDownloadArtwork', () => {
  it('libera FASE e ADMIN sem consultar pedidos', async () => {
    expect(await canDownloadArtwork({ userId: 'u', role: Role.FASE, artworkId: 'a', isFree: false })).toBe(true)
    expect(await canDownloadArtwork({ userId: 'u', role: Role.ADMIN, artworkId: 'a', isFree: false })).toBe(true)
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled()
  })

  it('bloqueia visitante / role indefinida', async () => {
    expect(await canDownloadArtwork({ userId: 'u', role: Role.VISITOR, artworkId: 'a', isFree: false })).toBe(false)
    expect(await canDownloadArtwork({ userId: 'u', role: undefined, artworkId: 'a', isFree: false })).toBe(false)
  })

  it('libera cliente para arte grátis sem consultar pedidos', async () => {
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: true })).toBe(true)
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled()
  })

  it('cliente só baixa arte paga quando há pedido PAGO', async () => {
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(false)

    prismaMock.order.findFirst.mockResolvedValue({ id: 'pago' })
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(true)
  })
})
