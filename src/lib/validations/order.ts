import { z } from 'zod'

// IDs do Prisma são cuids: alfanuméricos curtos. Restringir charset e tamanho
// rejeita payloads malformados/gigantes antes de tocar o banco.
const idSchema = z
  .string()
  .min(1, 'ID obrigatório')
  .max(64, 'ID inválido')
  .regex(/^[a-z0-9_-]+$/i, 'ID inválido')

// O cliente só informa qual arte quer comprar; o preço é sempre lido do banco
// no servidor (nunca confiar em valor vindo do cliente).
export const createOrderSchema = z.object({
  artworkId: idSchema,
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
