import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { hashPassword } from '@/lib/auth/password'
import { Prisma, Role } from '@prisma/client'
import { userUpdateSchema } from '@/lib/validations/admin'

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params

    // Validação via Zod antes de qualquer trabalho pesado (ex.: hashPassword/scrypt).
    // O limite de 200 chars na senha aqui é barreira contra CPU DoS — scrypt em
    // strings enormes satura o servidor antes de qualquer auth check importar.
    const parsed = userUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, role, password } = parsed.data
    const dataToUpdate: Prisma.UserUpdateInput = {}

    if (name !== undefined) dataToUpdate.name = name || null

    if (role !== undefined) {
      dataToUpdate.role = role as Role
    }

    if (password !== undefined) {
      dataToUpdate.passwordHash = await hashPassword(password)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: publicUserSelect,
    })

    return NextResponse.json({ success: true, data: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar usuário.' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params

    // Prevent deleting the main admin account if it has id 'admin'
    if (id === 'admin') {
      return NextResponse.json({ success: false, error: 'Não é possível excluir a conta master do administrador.' }, { status: 400 })
    }

    // Soft delete por role: nunca apagamos fisicamente o usuário (preserva o
    // histórico de downloads, que tem FK obrigatória sem cascade). Rebaixar para
    // VISITOR revoga todo o acesso de equipe (FASE/ADMIN) — o GET de equipe não
    // lista mais VISITOR, então ele sai da tela como se tivesse sido removido.
    const revokedUser = await prisma.user.update({
      where: { id },
      data: { role: Role.VISITOR },
      select: publicUserSelect,
    })

    return NextResponse.json({ success: true, data: revokedUser })
  } catch (error) {
    console.error('Error revoking user access:', error)
    return NextResponse.json({ success: false, error: 'Erro ao revogar acesso do usuário.' }, { status: 500 })
  }
}
