import { z } from 'zod'

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'O código deve ter pelo menos 3 caracteres')
    .max(30, 'O código deve ter no máximo 30 caracteres')
    .transform((s) => s.toUpperCase()),
  discountType: z.enum(['PERCENTAGE', 'FIXED'], 'Tipo de desconto inválido'),
  discountValue: z.number().int().positive('O valor do desconto deve ser positivo'),
  minPurchaseCents: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

export const applyCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'O código deve ter pelo menos 3 caracteres')
    .max(30, 'O código deve ter no máximo 30 caracteres'),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>
