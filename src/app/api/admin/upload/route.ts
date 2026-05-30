import { NextResponse } from 'next/server'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { uploadFileToR2 } from '@/lib/r2/upload'

export async function POST(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as 'previews' | 'files') || 'files'

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadResult = await uploadFileToR2(
      buffer,
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
