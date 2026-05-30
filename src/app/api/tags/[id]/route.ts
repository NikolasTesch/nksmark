import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params

    const deletedTag = await prisma.tag.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, data: deletedTag })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json({ success: false, error: 'Erro ao excluir tag' }, { status: 500 })
  }
}
