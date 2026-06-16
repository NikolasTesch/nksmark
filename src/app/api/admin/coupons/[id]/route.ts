import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { protectAdminRoute } from '@/lib/auth/middleware'
import { Prisma } from '@prisma/client'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params
    const body = await req.json()

    // Build update payload with only allowed fields
    const dataToUpdate: Prisma.CouponUpdateInput = {}

    if (body.code !== undefined) {
      // Check uniqueness if code is being changed
      const existing = await prisma.coupon.findUnique({ where: { code: body.code } })
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Já existe um cupom com este código.' },
          { status: 409 }
        )
      }
      dataToUpdate.code = body.code.toUpperCase()
    }

    if (body.discountType !== undefined) {
      if (body.discountType !== 'PERCENTAGE' && body.discountType !== 'FIXED') {
        return NextResponse.json(
          { success: false, error: 'Tipo de desconto inválido.' },
          { status: 400 }
        )
      }
      dataToUpdate.discountType = body.discountType
    }

    if (body.discountValue !== undefined) {
      if (!Number.isInteger(body.discountValue) || body.discountValue <= 0) {
        return NextResponse.json(
          { success: false, error: 'O valor do desconto deve ser um inteiro positivo.' },
          { status: 400 }
        )
      }
      dataToUpdate.discountValue = body.discountValue
    }

    if (body.description !== undefined) {
      dataToUpdate.description = body.description
    }

    if (body.minPurchaseCents !== undefined) {
      dataToUpdate.minPurchaseCents = body.minPurchaseCents
    }

    if (body.maxUses !== undefined) {
      dataToUpdate.maxUses = body.maxUses
    }

    if (body.expiresAt !== undefined) {
      dataToUpdate.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    }

    if (body.isActive !== undefined) {
      dataToUpdate.isActive = body.isActive
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json({ success: true, data: updatedCoupon })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Cupom não encontrado.' },
        { status: 404 }
      )
    }
    console.error('Error updating coupon:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar cupom.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authStatus = await protectAdminRoute()
    if (!authStatus.authorized) {
      return authStatus.response
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const force = searchParams.get('force') === 'true'

    // Check if coupon exists
    const coupon = await prisma.coupon.findUnique({ where: { id } })
    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Cupom não encontrado.' },
        { status: 404 }
      )
    }

    // Only allow deletion if never used or force=true
    if (coupon.usedCount > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          error: `Cupom já foi usado ${coupon.usedCount} vez(es). Use force=true para excluir mesmo assim.`,
        },
        { status: 409 }
      )
    }

    await prisma.coupon.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Cupom não encontrado.' },
        { status: 404 }
      )
    }
    console.error('Error deleting coupon:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir cupom.' },
      { status: 500 }
    )
  }
}
