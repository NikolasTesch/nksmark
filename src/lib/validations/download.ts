import { z } from 'zod'

export const downloadRequestSchema = z.object({
  artworkId: z.string().min(1, 'ID da arte é obrigatório'),
  fileId: z.string().min(1, 'ID do arquivo é obrigatório'),
})

export type DownloadRequestInput = z.infer<typeof downloadRequestSchema>
