import { z } from 'zod'

// IDs do Prisma são cuids: alfanuméricos curtos. Restringir charset e tamanho
// rejeita payloads malformados/gigantes antes de tocar o banco.
const idSchema = z
  .string()
  .min(1, 'ID obrigatório')
  .max(64, 'ID inválido')
  .regex(/^[a-z0-9_-]+$/i, 'ID inválido')

export const downloadRequestSchema = z.object({
  artworkId: idSchema,
  fileId: idSchema,
})

export type DownloadRequestInput = z.infer<typeof downloadRequestSchema>

// Download agrupado: baixa todos os arquivos da arte num único .zip.
export const zipDownloadRequestSchema = z.object({
  artworkId: idSchema,
})

export type ZipDownloadRequestInput = z.infer<typeof zipDownloadRequestSchema>
