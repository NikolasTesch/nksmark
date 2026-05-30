import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'

export async function GET() {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const downloads = await prisma.download.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        },
        artwork: {
          select: {
            title: true,
          }
        }
      }
    })

    // Fetch the real formats of the files downloaded using their fileIds
    const fileIds = [...new Set(downloads.map((dl) => dl.fileId))]
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds } },
      select: { id: true, format: true },
    })
    const formatByFileId = new Map(files.map((f) => [f.id, f.format]))

    const formattedDownloads = downloads.map((dl) => ({
      id: dl.id,
      userName: dl.user.name ?? 'Sem Nome',
      userEmail: dl.user.email,
      artworkTitle: dl.artwork.title,
      format: formatByFileId.get(dl.fileId) ?? 'CDR',
      createdAt: dl.createdAt.toISOString()
    }))

    return NextResponse.json({ success: true, data: formattedDownloads })
  } catch (error) {
    console.error('Error fetching admin download logs:', error)
    return NextResponse.json({ success: false, error: 'Erro ao carregar os logs de download.' }, { status: 500 })
  }
}
