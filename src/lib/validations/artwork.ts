import { z } from 'zod'

// Arquivos privados (CDR/AI/PDF/OTF) armazenam apenas a chave R2 (ex: "files/1234-arte.cdr"),
// não uma URL pública. Por isso aceitamos qualquer string não-vazia além de URLs completas.
export const fileSchema = z.object({
  id: z.string().optional(),
  format: z.enum(['CDR', 'AI', 'PDF', 'OTF', 'PNG', 'JPG']),
  url: z.string().min(1, 'Caminho do arquivo obrigatório'),
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
  addGalleryImages: z
    .array(
      z.object({
        url: z.string().url('URL inválida'),
        format: z.enum(['PNG', 'JPG']),
        size: z.number().positive('Tamanho inválido'),
      })
    )
    .optional(),
  removeFileIds: z.array(z.string()).optional(),
})

export type ArtworkInput = z.infer<typeof artworkSchema>
