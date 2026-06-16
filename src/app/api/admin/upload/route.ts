import { NextResponse } from 'next/server'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { uploadFileToR2 } from '@/lib/r2/upload'
import { applyWatermark } from '@/lib/watermark'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB — coerente com o limite exibido na UI
const ALLOWED_EXTENSIONS = ['cdr', 'ai', 'pdf', 'otf', 'png', 'jpg', 'jpeg']
const ALLOWED_FOLDERS = ['previews', 'files'] as const

export async function POST(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folderRaw = String(formData.get('folder') || 'files')
    const folder = (ALLOWED_FOLDERS as readonly string[]).includes(folderRaw)
      ? (folderRaw as 'previews' | 'files')
      : 'files'

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    // Validação server-side: nunca confiar só no accept do input do client.
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { success: false, error: `Formato não permitido (.${extension}).` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Arquivo excede o limite de 50 MB.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Aplicar watermark em imagens de preview e galeria
    let processedBuffer = buffer
    const isImage = file.type?.startsWith('image/') ?? false
    const shouldWatermark =
      isImage &&
      (folder === 'previews' ||
        (folder === 'files' && ['png', 'jpg', 'jpeg'].includes(extension)))

    if (shouldWatermark) {
      try {
        processedBuffer = (await applyWatermark(buffer, file.type || 'image/png')) as unknown as typeof buffer
        console.log(`[Watermark] Applied to ${file.name} in ${folder}`)
      } catch (wmError) {
        // Graceful degradation: se sharp falhar, usar buffer original
        console.error(`[Watermark] Failed for ${file.name}, using original:`, wmError)
      }
    }

    const uploadResult = await uploadFileToR2(
      processedBuffer,
      file.name,
      file.type || 'application/octet-stream',
      folder
    )

    return NextResponse.json({ success: true, data: uploadResult })
  } catch (error) {
    console.error('Error in upload API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno no servidor de uploads' }, { status: 500 })
  }
}
