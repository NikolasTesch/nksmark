import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3Client, R2_BUCKET_NAME } from './client'

export interface UploadResult {
  url: string
  key: string
  size: number
}

// Formatos de vetor/original — ativos vendáveis que NUNCA podem ter URL pública.
// O download desses arquivos acontece exclusivamente via URL assinada (/api/downloads).
// Mockups/capas (PNG/JPG) são públicos e servidos direto pelo domínio público do R2.
const PRIVATE_EXTENSIONS = ['cdr', 'ai', 'pdf', 'otf']

function isPrivateAsset(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return PRIVATE_EXTENSIONS.includes(ext)
}

export async function uploadFileToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder: 'previews' | 'files' = 'files'
): Promise<UploadResult> {
  // `fileName` pode vir de input público (sugestões). Sanitizamos para não
  // injetar separadores de caminho (`/`, `..`) nem caracteres de controle na
  // chave do R2 — mantém o namespace previsível dentro de `previews/` | `files/`.
  const safeName =
    (fileName || 'arquivo')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.') // colapsa ".." em qualquer posição (anti-traversal)
      .replace(/^\.+/, '') // remove pontos iniciais (ex.: ".." → "")
      .slice(0, 100) || 'arquivo'
  const key = `${folder}/${Date.now()}-${safeName}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  )

  // Originais privados guardam apenas a `key` — assim, mesmo que o registro vaze,
  // não há URL pública direta para o vetor. O endpoint de download assina a key.
  let url: string
  if (isPrivateAsset(fileName)) {
    url = key
  } else {
    const publicUrl = process.env.R2_PUBLIC_URL || ''
    url = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${key}` : `/api/r2-mock/${key}`
  }

  return {
    url,
    key,
    size: fileBuffer.length,
  }
}
