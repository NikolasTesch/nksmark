import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { generateSlug } from '@/lib/utils/slug'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params
    const body = await req.json()
    const { name, color, showInFilter, filterOrder } = body

    const dataToUpdate: Record<string, any> = {}

    if (name !== undefined) {
      dataToUpdate.name = name
      dataToUpdate.slug = generateSlug(name)
    }
    if (color !== undefined) dataToUpdate.color = color || null
    if (showInFilter !== undefined) dataToUpdate.showInFilter = showInFilter
    if (filterOrder !== undefined) dataToUpdate.filterOrder = filterOrder

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json({ success: true, data: updatedCategory })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar categoria' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params

    // Check if there are artworks connected
    const artworkCount = await prisma.artwork.count({
      where: { categoryId: id },
    })

    if (artworkCount > 0) {
      return NextResponse.json({
        success: false,
        error: 'Não é possível excluir esta categoria pois ela possui artes vinculadas.'
      }, { status: 400 })
    }

    const deletedCategory = await prisma.category.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, data: deletedCategory })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ success: false, error: 'Erro ao excluir categoria' }, { status: 500 })
  }
}
