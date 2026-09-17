import { NextResponse } from 'next/server'
import { protectArtworkManagementRoute } from '@/lib/auth/middleware'
import { getSignedUploadUrl } from '@/lib/r2/signed-url'
import { logger as log } from '@/lib/utils/logger'
import { z } from 'zod'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_EXTENSIONS = ['cdr', 'ai', 'pdf', 'otf', 'png', 'jpg', 'jpeg']
const ALLOWED_FOLDERS = ['previews', 'files'] as const

const presignSchema = z.object({
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  contentType: z.string().min(1, 'Content-Type é obrigatório'),
  size: z.number().int().positive().max(MAX_FILE_SIZE, 'Arquivo excede o limite de 50 MB'),
  folder: z.enum(ALLOWED_FOLDERS).default('files'),
})

export async function POST(req: Request) {
  try {
    const authStatus = await protectArtworkManagementRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'JSON inválido na requisição.' },
        { status: 400 }
      )
    }

    const parsed = presignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      )
    }

    const { fileName, contentType, folder } = parsed.data

    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { success: false, error: `Formato não permitido (.${extension}).` },
        { status: 400 }
      )
    }

    const result = await getSignedUploadUrl(fileName, contentType, folder)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    log.error('Error in upload presign API:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao gerar URL pré-assinada para upload.' },
      { status: 500 }
    )
  }
}
