import { OrderStatus, Role } from '@prisma/client'
import prisma from '@/lib/prisma'

/**
 * Decide se um usuário pode baixar os arquivos de uma arte.
 *
 * - FASE/ADMIN: sempre (equipe interna baixa de graça).
 * - CLIENT: se a arte é grátis, se possui um `OrderItem` PAGO da arte (via
 *   Order PAID — cobre pedidos novos e legados migrados), OU se tem uma
 *   assinatura do acervo `authorized` com ciclo vigente (mesma folga do FASE:
 *   baixa qualquer arte publicada). Sem assinatura, segue a regra de compra.
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

  // Assinatura do acervo ativa e dentro do ciclo vigente libera o acervo todo.
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  })
  if (
    sub &&
    sub.status === 'authorized' &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd.getTime() > Date.now()
  ) {
    return true
  }

  const paid = await prisma.orderItem.findFirst({
    where: {
      artworkId,
      order: { userId, status: OrderStatus.PAID },
    },
    select: { id: true },
  })
  return paid !== null
}
