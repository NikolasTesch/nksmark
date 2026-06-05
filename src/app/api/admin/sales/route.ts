import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { OrderStatus } from '@prisma/client'

// Análise de vendas (pedidos PAGOS) por período: receita, top artes, nichos
// (categorias) mais vendidos e clientes que mais compraram.
export async function GET(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const selectedYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear()
    const selectedMonth = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1

    const startDate = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0)
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
    const prevStart = new Date(selectedYear, selectedMonth - 2, 1, 0, 0, 0, 0)
    const prevEnd = new Date(selectedYear, selectedMonth - 1, 0, 23, 59, 59, 999)

    const paidWhere = (gte: Date, lte: Date) => ({
      status: OrderStatus.PAID,
      paidAt: { gte, lte },
    })

    const orders = await prisma.order.findMany({
      where: paidWhere(startDate, endDate),
      include: {
        artwork: { select: { id: true, title: true, category: { select: { id: true, name: true, color: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { paidAt: 'desc' },
    })

    const totalSales = orders.length
    const totalRevenueCents = orders.reduce((sum, o) => sum + o.amountCents, 0)
    const avgTicketCents = totalSales > 0 ? Math.round(totalRevenueCents / totalSales) : 0

    // Receita do mês anterior, para variação percentual.
    const prevOrders = await prisma.order.findMany({
      where: paidWhere(prevStart, prevEnd),
      select: { amountCents: true },
    })
    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.amountCents, 0)
    let percentChangeFromPrevMonth = 0
    if (prevRevenue > 0) {
      percentChangeFromPrevMonth = Math.round(((totalRevenueCents - prevRevenue) / prevRevenue) * 100)
    } else if (totalRevenueCents > 0) {
      percentChangeFromPrevMonth = 100
    }

    // Top artes vendidas (por nº de vendas e receita).
    const artworkMap = new Map<string, { title: string; categoryName: string; count: number; revenueCents: number }>()
    for (const o of orders) {
      const key = o.artwork.id
      const entry = artworkMap.get(key) || {
        title: o.artwork.title,
        categoryName: o.artwork.category.name,
        count: 0,
        revenueCents: 0,
      }
      entry.count += 1
      entry.revenueCents += o.amountCents
      artworkMap.set(key, entry)
    }
    const topArtworks = Array.from(artworkMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count || b.revenueCents - a.revenueCents)
      .slice(0, 8)

    // Nichos (categorias) mais vendidos.
    const categoryMap = new Map<string, { name: string; color: string | null; count: number; revenueCents: number }>()
    for (const o of orders) {
      const cat = o.artwork.category
      const entry = categoryMap.get(cat.id) || { name: cat.name, color: cat.color, count: 0, revenueCents: 0 }
      entry.count += 1
      entry.revenueCents += o.amountCents
      categoryMap.set(cat.id, entry)
    }
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        color: v.color,
        count: v.count,
        revenueCents: v.revenueCents,
        percentage: totalSales > 0 ? Math.round((v.count / totalSales) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    // Clientes que mais compraram.
    const clientMap = new Map<string, { name: string | null; email: string; count: number; revenueCents: number }>()
    for (const o of orders) {
      const entry = clientMap.get(o.user.id) || {
        name: o.user.name,
        email: o.user.email,
        count: 0,
        revenueCents: 0,
      }
      entry.count += 1
      entry.revenueCents += o.amountCents
      clientMap.set(o.user.id, entry)
    }
    const topClients = Array.from(clientMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenueCents - a.revenueCents || b.count - a.count)
      .slice(0, 8)

    // Pedidos recentes (para a tabela).
    const recentOrders = orders.slice(0, 12).map((o) => ({
      id: o.id,
      artworkTitle: o.artwork.title,
      categoryName: o.artwork.category.name,
      clientName: o.user.name || o.user.email,
      amountCents: o.amountCents,
      paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        selectedFilters: { month: selectedMonth, year: selectedYear },
        stats: {
          totalRevenueCents,
          totalSales,
          avgTicketCents,
          totalClients: clientMap.size,
          percentChangeFromPrevMonth,
        },
        topArtworks,
        categoryDistribution,
        topClients,
        recentOrders,
      },
    })
  } catch (error) {
    console.error('Error fetching admin sales:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar a análise de vendas.' },
      { status: 500 }
    )
  }
}
