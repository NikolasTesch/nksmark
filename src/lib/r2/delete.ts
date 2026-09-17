import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client, R2_BUCKET_NAME } from './client'
import { logger as log } from '@/lib/utils/logger'

/**
 * Extrai a chave S3/R2 relativa a partir de uma URL pública ou chave direta.
 * Trata tanto prefixos 'files/' quanto 'previews/' e URLs completas.
 */
export function extractR2Key(urlOrKey: string): string {
  if (!urlOrKey) return ''
  
  // Se já for uma chave relativa iniciando com deleted/, files/ ou previews/
  if (urlOrKey.startsWith('deleted/')) return urlOrKey
  
  const filesIdx = urlOrKey.indexOf('files/')
  if (filesIdx >= 0) return urlOrKey.substring(filesIdx)
  
  const previewsIdx = urlOrKey.indexOf('previews/')
  if (previewsIdx >= 0) return urlOrKey.substring(previewsIdx)
  
  // Se contiver mock local (/api/r2-mock/...)
  const mockIdx = urlOrKey.indexOf('/api/r2-mock/')
  if (mockIdx >= 0) return urlOrKey.substring(mockIdx + '/api/r2-mock/'.length)

  return urlOrKey
}

/**
 * Move um arquivo no bucket R2 para o prefixo 'deleted/'.
 * Realiza uma cópia para 'deleted/<originalKey>' e em seguida deleta o arquivo da localização original.
 * 
 * Retorna a nova chave no R2.
 */
export async function moveObjectToDeleted(sourceUrlOrKey: string): Promise<string> {
  const originalKey = extractR2Key(sourceUrlOrKey)
  if (!originalKey) return ''

  // Se já foi movido para deleted/, não faz nada
  if (originalKey.startsWith('deleted/')) {
    return originalKey
  }

  const destinationKey = `deleted/${originalKey}`

  try {
    // 1. Copia o objeto para a nova localização sob o prefixo deleted/
    // Nota: S3 CopySource exige o formato 'BucketName/Key' (com URL encoding da chave se necessário)
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: R2_BUCKET_NAME,
        CopySource: `${R2_BUCKET_NAME}/${encodeURIComponent(originalKey).replace(/%2F/g, '/')}`,
        Key: destinationKey,
      })
    )

    // 2. Deleta o objeto da localização original
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: originalKey,
      })
    )

    return destinationKey
  } catch (error) {
    log.error(`[R2] Falha ao mover objeto '${originalKey}' para '${destinationKey}':`, error)
    // Em caso de falha no storage (ex: arquivo não existe ou mock em dev), 
    // retorna a nova chave planejada para não travar a operação de banco
    return destinationKey
  }
}

/**
 * Move todos os arquivos associados a uma arte (arquivos originais e capa/preview)
 * para a pasta 'deleted/' no Cloudflare R2.
 */
export async function moveArtworkFilesToDeleted(artwork: {
  previewUrl?: string | null
  files: Array<{ id: string; url: string }>
}): Promise<{
  newPreviewUrl: string | null
  updatedFiles: Array<{ id: string; newUrl: string }>
}> {
  let newPreviewUrl: string | null = artwork.previewUrl ?? null

  if (artwork.previewUrl) {
    const isR2Url =
      artwork.previewUrl.includes('previews/') ||
      artwork.previewUrl.includes('files/') ||
      artwork.previewUrl.includes(process.env.R2_PUBLIC_URL || 'r2.cloudflarestorage.com')
    
    if (isR2Url) {
      const movedKey = await moveObjectToDeleted(artwork.previewUrl)
      if (movedKey) {
        const publicUrl = process.env.R2_PUBLIC_URL || ''
        newPreviewUrl = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${movedKey}` : `/api/r2-mock/${movedKey}`
      }
    }
  }

  const updatedFiles: Array<{ id: string; newUrl: string }> = []
  for (const file of artwork.files) {
    const movedKey = await moveObjectToDeleted(file.url)
    updatedFiles.push({
      id: file.id,
      newUrl: movedKey || file.url,
    })
  }

  return {
    newPreviewUrl,
    updatedFiles,
  }
}
