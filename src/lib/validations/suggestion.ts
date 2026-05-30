import { z } from 'zod'

export const suggestionSchema = z.object({
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres').max(1000, 'A descrição deve ter no máximo 1000 caracteres'),
  imageUrl: z.string().url('URL inválida').optional().nullable().or(z.literal('')),
})

export type SuggestionInput = z.infer<typeof suggestionSchema>
