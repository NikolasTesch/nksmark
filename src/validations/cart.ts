import { z } from 'zod'

export const addToCartSchema = z.object({
  artworkId: z.string().min(1, 'ID da arte é obrigatório'),
})

export const removeFromCartSchema = z.object({
  itemId: z.string().min(1, 'ID do item é obrigatório'),
})

export const applyCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'O cupom deve ter pelo menos 3 caracteres')
    .max(30, 'O cupom deve ter no máximo 30 caracteres')
    .transform((s) => s.toUpperCase()),
})

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>
