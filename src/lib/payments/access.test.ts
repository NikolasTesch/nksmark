import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Role } from '@prisma/client'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    orderItem: { findFirst: vi.fn() },
    subscription: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/prisma', () => ({ default: prismaMock }))

import { canDownloadArtwork } from './access'

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.orderItem.findFirst.mockResolvedValue(null)
  prismaMock.subscription.findUnique.mockResolvedValue(null)
})

describe('canDownloadArtwork', () => {
  it('libera FASE e ADMIN sem consultar pedidos', async () => {
    expect(await canDownloadArtwork({ userId: 'u', role: Role.FASE, artworkId: 'a', isFree: false })).toBe(true)
    expect(await canDownloadArtwork({ userId: 'u', role: Role.ADMIN, artworkId: 'a', isFree: false })).toBe(true)
    expect(prismaMock.orderItem.findFirst).not.toHaveBeenCalled()
  })

  it('bloqueia visitante / role indefinida', async () => {
    expect(await canDownloadArtwork({ userId: 'u', role: Role.VISITOR, artworkId: 'a', isFree: false })).toBe(false)
    expect(await canDownloadArtwork({ userId: 'u', role: undefined, artworkId: 'a', isFree: false })).toBe(false)
  })

  it('libera cliente para arte grátis sem consultar pedidos', async () => {
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: true })).toBe(true)
    expect(prismaMock.orderItem.findFirst).not.toHaveBeenCalled()
  })

  it('cliente só baixa arte paga quando há pedido PAGO', async () => {
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(false)

    prismaMock.orderItem.findFirst.mockResolvedValue({ id: 'pago' })
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(true)
  })

  it('revoga download após estorno: pedido REFUNDED bloqueia o cliente (gate de /downloads e /zip)', async () => {
    // Pedido REFUNDED não casa com a query `status: PAID` do Prisma → findFirst
    // retorna null → cliente perde o download imediatamente (CA-1).
    prismaMock.orderItem.findFirst.mockResolvedValue(null)
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(false)
  })

  it('revoga download se o pedido estiver FAILED (não é PAID)', async () => {
    prismaMock.orderItem.findFirst.mockResolvedValue(null)
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(false)
  })

  it('assinatura authorized com ciclo vigente libera qualquer arte (mesmo sem compra)', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      status: 'authorized',
      currentPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(true)
    // Não precisa consultar pedidos quando a assinatura cobre o acesso.
    expect(prismaMock.orderItem.findFirst).not.toHaveBeenCalled()
  })

  it('assinatura authorized com ciclo EXPIRADO bloqueia (cai na regra de compra)', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      status: 'authorized',
      currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
    })
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(false)
  })

  it('assinatura não-authorized (pending/cancelled) não libera', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ status: 'cancelled', currentPeriodEnd: null })
    expect(await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })).toBe(false)
  })

  it('assinatura ativa é consultada antes da regra de compra (economiza 1 query quando libera)', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({
      status: 'authorized',
      currentPeriodEnd: new Date(Date.now() + 60 * 1000),
    })
    await canDownloadArtwork({ userId: 'u', role: Role.CLIENT, artworkId: 'a', isFree: false })
    expect(prismaMock.subscription.findUnique).toHaveBeenCalledTimes(1)
    expect(prismaMock.orderItem.findFirst).not.toHaveBeenCalled()
  })
})
