import { NextResponse } from 'next/server'
import { Status } from '@prisma/client'
import { downloadRequestSchema } from '@/lib/validations/download'
import { protectFaseRoute } from '@/lib/auth/middleware'
import prisma from '@/lib/prisma'
import { getSignedDownloadUrl } from '@/lib/r2/signed-url'

export async function POST(req: Request) {
  try {
    const authStatus = await protectFaseRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const userId = authStatus.user?.id as string

    const body = await req.json()
    const result = downloadRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { artworkId, fileId } = result.data

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { artwork: true },
    })

    if (!file || file.artworkId !== artworkId) {
      return NextResponse.json(
        { success: false, error: 'Arquivo ou arte correspondente não localizado.' },
        { status: 404 }
      )
    }

    // Só é permitido baixar artes efetivamente publicadas no catálogo.
    if (file.artwork.status !== Status.PUBLISHED) {
      return NextResponse.json(
        { success: false, error: 'Esta arte não está disponível para download.' },
        { status: 403 }
      )
    }

    await prisma.download.create({
      data: {
        userId,
        artworkId,
        fileId,
      },
    })

    const fileKey = file.url.includes('http') 
      ? file.url.substring(file.url.indexOf('files/'))
      : file.url

    const signedUrl = await getSignedDownloadUrl(fileKey, `${file.artwork.title.toLowerCase().replace(/\s+/g, '-')}.${file.format.toLowerCase()}`)

    return NextResponse.json({ success: true, data: { downloadUrl: signedUrl } })
  } catch (error) {
    console.error('Error in downloads API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const authStatus = await protectFaseRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const userId = authStatus.user?.id as string

    const downloads = await prisma.download.findMany({
      where: { userId },
      include: {
        artwork: {
          select: {
            id: true,
            title: true,
            previewUrl: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Busca o formato real de cada arquivo baixado (fileId é um cuid, não carrega o formato).
    const fileIds = [...new Set(downloads.map((dl) => dl.fileId))]
    const files = await prisma.file.findMany({
      where: { id: { in: fileIds } },
      select: { id: true, format: true },
    })
    const formatByFileId = new Map(files.map((f) => [f.id, f.format]))

    // Format list similar to useDownloadHistory shape
    const history = downloads.map((dl) => ({
      id: dl.id,
      artworkId: dl.artworkId,
      artworkTitle: dl.artwork.title,
      previewUrl: dl.artwork.previewUrl,
      format: formatByFileId.get(dl.fileId) ?? 'N/D',
      downloadedAt: dl.createdAt.toISOString()
    }))

    return NextResponse.json({ success: true, data: history })
  } catch (error) {
    console.error('Error fetching download history:', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar histórico no servidor.' }, { status: 500 })
  }
}
