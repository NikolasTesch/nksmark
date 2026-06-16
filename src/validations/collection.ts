import { z } from 'zod'

export const createCollectionSchema = z.object({
  title: z
    .string()
    .min(1, 'O título é obrigatório')
    .max(100, 'O título deve ter no máximo 100 caracteres'),
  slug: z
    .string()
    .min(1, 'O slug é obrigatório')
    .max(100, 'O slug deve ter no máximo 100 caracteres')
    .regex(/^[a-z0-9-]+$/, 'O slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
})

export const addArtworkToCollectionSchema = z.object({
  artworkId: z.string().min(1, 'ID da arte é obrigatório'),
  order: z.number().int().min(0).optional(),
})

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>
export type AddArtworkToCollectionInput = z.infer<typeof addArtworkToCollectionSchema>
