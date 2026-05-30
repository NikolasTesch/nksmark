import { z } from 'zod'

export const fileSchema = z.object({
  id: z.string().optional(),
  format: z.enum(['CDR', 'AI', 'PDF', 'OTF', 'PNG', 'JPG']),
  url: z.string().url('URL inválida'),
  size: z.number().positive('Tamanho deve ser maior que zero'),
})

export const artworkSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  isFree: z.boolean().default(true),
  previewUrl: z.string().url('URL de preview inválida'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  tagNames: z.array(z.string()).optional(),
  files: z.array(fileSchema).min(1, 'Adicione pelo menos um arquivo original'),
})

export type ArtworkInput = z.infer<typeof artworkSchema>
