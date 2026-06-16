import { z } from 'zod'

const idSchema = z
  .string()
  .min(1, 'ID obrigatório')
  .max(64, 'ID inválido')
  .regex(/^[a-z0-9_-]+$/i, 'ID inválido')

export const addToCartSchema = z.object({
  artworkId: idSchema,
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
