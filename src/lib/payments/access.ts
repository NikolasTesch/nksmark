import { OrderStatus, Role } from '@prisma/client'
import prisma from '@/lib/prisma'

/**
 * Decide se um usuário pode baixar os arquivos de uma arte.
 *
 * - FASE/ADMIN: sempre (equipe interna baixa de graça).
 * - CLIENT: apenas se a arte é grátis OU possui um `Order` PAGO da arte.
 * - Demais (VISITOR): nunca.
 *
 * A verificação de status PUBLISHED da arte continua a cargo do route handler.
 */
export async function canDownloadArtwork(params: {
  userId: string
  role: Role | undefined
  artworkId: string
  isFree: boolean
}): Promise<boolean> {
  const { userId, role, artworkId, isFree } = params

  if (role === Role.FASE || role === Role.ADMIN) return true
  if (role !== Role.CLIENT) return false
  if (isFree) return true

  const paid = await prisma.order.findFirst({
    where: { userId, artworkId, status: OrderStatus.PAID },
    select: { id: true },
  })
  return paid !== null
}
