import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { Role } from '@prisma/client'

export async function GET() {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const [totalArtworks, totalDownloads, totalCategories, totalUsers] = await Promise.all([
      prisma.artwork.count(),
      prisma.download.count(),
      prisma.category.count(),
      prisma.user.count({
        where: {
          role: { in: [Role.FASE, Role.ADMIN] }
        }
      })
    ])

    const recentDownloads = await prisma.download.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
        artwork: { select: { title: true } }
      }
    })

    const recentFileIds = [...new Set(recentDownloads.map((dl) => dl.fileId))]
    const recentFiles = await prisma.file.findMany({
      where: { id: { in: recentFileIds } },
      select: { id: true, format: true },
    })
    const recentFormatByFileId = new Map(recentFiles.map((f) => [f.id, f.format]))

    const formattedDownloads = recentDownloads.map((dl) => ({
      id: dl.id,
      email: dl.user.email,
      art: dl.artwork.title,
      format: recentFormatByFileId.get(dl.fileId) ?? 'CDR',
      time: dl.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          artworks: totalArtworks,
          downloads: totalDownloads,
          categories: totalCategories,
          users: totalUsers,
        },
        recentDownloads: formattedDownloads,
      }
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar estatísticas do admin' }, { status: 500 })
  }
}
