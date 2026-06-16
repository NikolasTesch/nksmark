import { z } from 'zod'

export const supportSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(254, 'Email muito longo'),
  message: z.string().min(10, 'A mensagem deve ter pelo menos 10 caracteres').max(2000, 'A mensagem deve ter no máximo 2000 caracteres'),
})

export type SupportInput = z.infer<typeof supportSchema>
