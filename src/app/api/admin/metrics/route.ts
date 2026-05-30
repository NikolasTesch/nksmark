import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { Status } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { searchParams } = new URL(req.url)
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')
    const categoryIdParam = searchParams.get('categoryId') || 'all'

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const selectedYear = yearParam ? parseInt(yearParam) : currentYear
    const selectedMonth = monthParam ? parseInt(monthParam) : currentMonth

    // Calculate dates
    const startDate = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0)
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)

    // Calculate divisor days for averages (handling current month partial days)
    const totalDaysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    let daysToDivide = totalDaysInMonth
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      daysToDivide = now.getDate()
      if (daysToDivide < 1) daysToDivide = 1
    }

    // Fetch categories for filter listing
    const dbCategories = await prisma.category.findMany({
      select: { id: true, name: true, color: true }
    })

    // Main download query for the selected period
    const downloads = await prisma.download.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        artwork: categoryIdParam !== 'all' ? { categoryId: categoryIdParam } : undefined
      },
      include: {
        artwork: {
          select: {
            id: true,
            title: true,
            categoryId: true,
            category: { select: { name: true, color: true } }
          }
        }
      }
    })

    // Fetch previous month stats for percent change calculation
    const prevMonthStartDate = new Date(selectedYear, selectedMonth - 2, 1, 0, 0, 0, 0)
    const prevMonthEndDate = new Date(selectedYear, selectedMonth - 1, 0, 23, 59, 59, 999)

    const prevDownloadsCount = await prisma.download.count({
      where: {
        createdAt: {
          gte: prevMonthStartDate,
          lte: prevMonthEndDate
        },
        artwork: categoryIdParam !== 'all' ? { categoryId: categoryIdParam } : undefined
      }
    })

    // Calculate percent change
    const totalDownloads = downloads.length
    let percentChangeFromPrevMonth = 0
    if (prevDownloadsCount > 0) {
      percentChangeFromPrevMonth = Math.round(((totalDownloads - prevDownloadsCount) / prevDownloadsCount) * 100)
    } else if (totalDownloads > 0) {
      percentChangeFromPrevMonth = 100 // 100% increase if prev month had 0
    }

    // Active users count for selected period
    const activeUsers = new Set(downloads.map((d) => d.userId))
    const totalActiveUsers = activeUsers.size

    // Average per user
    const avgDownloadsPerUser = totalActiveUsers > 0 
      ? parseFloat((totalDownloads / totalActiveUsers).toFixed(1)) 
      : 0

    // Average downloads per published artwork
    const totalArtworks = await prisma.artwork.count({
      where: {
        status: Status.PUBLISHED,
        categoryId: categoryIdParam !== 'all' ? categoryIdParam : undefined
      }
    })
    const avgDownloadsPerArtwork = totalArtworks > 0 
      ? parseFloat((totalDownloads / totalArtworks).toFixed(2)) 
      : 0

    // Average downloads per day
    const avgDownloadsPerDay = parseFloat((totalDownloads / daysToDivide).toFixed(1))

    // Formats distribution
    const fileIds = [...new Set(downloads.map((d) => d.fileId))]
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds } },
      select: { id: true, format: true }
    })
    const formatByFileId = new Map(files.map((f) => [f.id, f.format]))

    const formatCounts: Record<string, number> = {}
    downloads.forEach((dl) => {
      const format = formatByFileId.get(dl.fileId) || 'CDR'
      formatCounts[format] = (formatCounts[format] || 0) + 1
    })

    const formatDistribution = Object.entries(formatCounts)
      .map(([format, count]) => ({
        format,
        count,
        percentage: totalDownloads > 0 ? Math.round((count / totalDownloads) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)

    // Category distribution
    const categoryCounts: Record<string, { name: string; color: string | null; count: number }> = {}
    dbCategories.forEach((cat) => {
      categoryCounts[cat.id] = { name: cat.name, color: cat.color, count: 0 }
    })

    downloads.forEach((dl) => {
      const catId = dl.artwork.categoryId
      if (categoryCounts[catId]) {
        categoryCounts[catId].count++
      } else {
        categoryCounts[catId] = {
          name: dl.artwork.category.name,
          color: dl.artwork.category.color,
          count: 1
        }
      }
    })

    const categoryDistribution = Object.entries(categoryCounts)
      .map(([id, data]) => ({
        id,
        name: data.name,
        color: data.color,
        count: data.count,
        percentage: totalDownloads > 0 ? Math.round((data.count / totalDownloads) * 100) : 0
      }))
      .filter((cat) => cat.count > 0) // only active ones
      .sort((a, b) => b.count - a.count)

    // Daily Trend
    const dailyTrend = Array.from({ length: totalDaysInMonth }, (_, i) => ({
      day: i + 1,
      count: 0
    }))

    downloads.forEach((dl) => {
      const day = dl.createdAt.getDate()
      if (day >= 1 && day <= totalDaysInMonth) {
        dailyTrend[day - 1].count++
      }
    })

    // Top downloaded artworks
    const artworkCounts: Record<string, { title: string; categoryName: string; count: number }> = {}
    downloads.forEach((dl) => {
      const artId = dl.artwork.id
      if (artworkCounts[artId]) {
        artworkCounts[artId].count++
      } else {
        artworkCounts[artId] = {
          title: dl.artwork.title,
          categoryName: dl.artwork.category.name,
          count: 1
        }
      }
    })

    const topArtworks = Object.entries(artworkCounts)
      .map(([id, data]) => ({
        id,
        title: data.title,
        categoryName: data.categoryName,
        downloadsCount: data.count
      }))
      .sort((a, b) => b.downloadsCount - a.downloadsCount)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      data: {
        categories: dbCategories.map((c) => ({ id: c.id, name: c.name })),
        selectedFilters: {
          month: selectedMonth,
          year: selectedYear,
          categoryId: categoryIdParam
        },
        stats: {
          totalDownloads,
          avgDownloadsPerDay,
          avgDownloadsPerUser,
          avgDownloadsPerArtwork,
          totalActiveUsers,
          percentChangeFromPrevMonth
        },
        dailyTrend,
        formatDistribution,
        categoryDistribution,
        topArtworks
      }
    })
  } catch (error) {
    console.error('Error fetching admin metrics:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar métricas do painel administrativo' },
      { status: 500 }
    )
  }
}
