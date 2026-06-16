import { NextResponse } from 'next/server'
import { protectAdminRoute } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) return authStatus.response

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30d'

    switch (period) {
      case '7d': {
        const start = new Date(Date.now() - 7 * 86400000)
        return await getTimeline(start, new Date())
      }
      case '30d': {
        const start = new Date(Date.now() - 30 * 86400000)
        return await getTimeline(start, new Date())
      }
      case 'month-to-date': {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        return await getTimeline(start, now)
      }
      case 'monthly': {
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
        return await getMonthly(year)
      }
      case 'payment-distribution':
        return await getPaymentDistribution()
      case 'peak-hours':
        return await getPeakHours()
      default:
        return NextResponse.json({ success: false, error: 'Período inválido.' }, { status: 400 })
    }
  } catch (error) {
    console.error('[Financeiro Error]', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar dados.' }, { status: 500 })
  }
}

async function getTimeline(start: Date, end: Date) {
  const orders = await prisma.order.findMany({
    where: { status: OrderStatus.PAID, paidAt: { gte: start, lte: end } },
    include: { items: { select: { amountCents: true } } },
    orderBy: { paidAt: 'asc' },
  })

  // Aggregate by date
  const byDate = new Map<string, { revenueCents: number; orderCount: number }>()
  for (const o of orders) {
    if (!o.paidAt) continue
    const key = o.paidAt.toISOString().split('T')[0]
    const prev = byDate.get(key) || { revenueCents: 0, orderCount: 0 }
    byDate.set(key, {
      revenueCents: prev.revenueCents + (o.items.length > 0 ? o.items.reduce((s, i) => s + i.amountCents, 0) : o.amountCents),
      orderCount: prev.orderCount + 1,
    })
  }

  return NextResponse.json({
    success: true,
    data: { timeline: Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v })) }
  })
}

async function getMonthly(year: number) {
  const orders = await prisma.order.findMany({
    where: {
      status: OrderStatus.PAID,
      paidAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59, 999) },
    },
    include: { items: { select: { amountCents: true } } },
  })

  const byMonth = new Map<number, { revenueCents: number; orderCount: number }>()
  for (const o of orders) {
    if (!o.paidAt) continue
    const m = o.paidAt.getMonth()
    const prev = byMonth.get(m) || { revenueCents: 0, orderCount: 0 }
    byMonth.set(m, {
      revenueCents: prev.revenueCents + (o.items.length > 0 ? o.items.reduce((s, i) => s + i.amountCents, 0) : o.amountCents),
      orderCount: prev.orderCount + 1,
    })
  }

  return NextResponse.json({
    success: true,
    data: { monthlyRevenue: Array.from(byMonth.entries()).map(([m, v]) => ({ month: m + 1, ...v })) }
  })
}

async function getPaymentDistribution() {
  const orders = await prisma.order.findMany({
    where: { status: OrderStatus.PAID },
    select: { paymentMethod: true, items: { select: { amountCents: true } }, amountCents: true },
  })

  const byMethod = new Map<string, { count: number; totalCents: number }>()
  for (const o of orders) {
    const method = o.paymentMethod || 'unknown'
    const prev = byMethod.get(method) || { count: 0, totalCents: 0 }
    byMethod.set(method, {
      count: prev.count + 1,
      totalCents: prev.totalCents + (o.items.length > 0 ? o.items.reduce((s, i) => s + i.amountCents, 0) : o.amountCents),
    })
  }

  const grandTotal = Array.from(byMethod.values()).reduce((s, v) => s + v.totalCents, 0)

  return NextResponse.json({
    success: true,
    data: {
      paymentDistribution: Array.from(byMethod.entries()).map(([method, v]) => ({
        method,
        ...v,
        percentage: grandTotal > 0 ? Math.round((v.totalCents / grandTotal) * 100) : 0,
      }))
    }
  })
}

async function getPeakHours() {
  const orders = await prisma.order.findMany({
    where: { status: OrderStatus.PAID, paidAt: { not: null } },
    select: { paidAt: true, items: { select: { amountCents: true } }, amountCents: true },
  })

  const byKey = new Map<string, { count: number; revenueCents: number }>()
  for (const o of orders) {
    if (!o.paidAt) continue
    const key = `${o.paidAt.getDay()}-${o.paidAt.getHours()}`
    const prev = byKey.get(key) || { count: 0, revenueCents: 0 }
    byKey.set(key, {
      count: prev.count + 1,
      revenueCents: prev.revenueCents + (o.items.length > 0 ? o.items.reduce((s, i) => s + i.amountCents, 0) : o.amountCents),
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      peakHours: Array.from(byKey.entries()).map(([key, v]) => {
        const [dayOfWeek, hour] = key.split('-').map(Number)
        return { dayOfWeek, hour, ...v }
      })
    }
  })
}
