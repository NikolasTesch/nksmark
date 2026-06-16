import { z } from 'zod'

// IDs do Prisma são cuids: alfanuméricos curtos. Restringir charset e tamanho
// rejeita payloads malformados/gigantes antes de tocar o banco.
const idSchema = z
  .string()
  .min(1, 'ID obrigatório')
  .max(64, 'ID inválido')
  .regex(/^[a-z0-9_-]+$/i, 'ID inválido')

export const createOrderSchema = z
  .object({
    // Legacy: suporte a compra de item único
    artworkId: idSchema.optional(),
    // Novo: suporte a múltiplos itens no pedido
    artworkIds: z.array(z.string().min(1)).min(1).optional(),
    // Cupom opcional
    couponCode: z.string().optional(),
  })
  .refine(
    (data) => data.artworkId !== undefined || data.artworkIds !== undefined,
    {
      message: 'É necessário informar ao menos uma arte (artworkId ou artworkIds)',
      path: ['artworkId'],
    }
  )

export type CreateOrderInput = z.infer<typeof createOrderSchema>
