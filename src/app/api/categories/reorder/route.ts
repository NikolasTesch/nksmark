import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'

const reorderSchema = z.object({
  order: z.array(z.object({ id: z.string(), filterOrder: z.number().int() })).min(1),
})

export async function PUT(req: Request) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) return authStatus.response

    const result = reorderSchema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      result.data.order.map(({ id, filterOrder }) =>
        prisma.category.update({ where: { id }, data: { filterOrder } })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering categories:', error)
    return NextResponse.json({ success: false, error: 'Erro ao reordenar categorias' }, { status: 500 })
  }
}
