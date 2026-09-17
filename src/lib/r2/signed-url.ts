import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, R2_BUCKET_NAME } from './client'

export async function getSignedDownloadUrl(fileKey: string, fileName?: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    ResponseContentDisposition: fileName ? `attachment; filename="${fileName}"` : 'attachment',
  })

  // Generates a pre-signed URL valid for 15 minutes (900 seconds)
  return await getSignedUrl(s3Client, command, { expiresIn: 900 })
}

export interface SignedUploadUrlResult {
  uploadUrl: string
  key: string
  url: string
}

const PRIVATE_EXTENSIONS = ['cdr', 'ai', 'pdf', 'otf']

export function isPrivateAsset(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return PRIVATE_EXTENSIONS.includes(ext)
}

export async function getSignedUploadUrl(
  fileName: string,
  contentType: string,
  folder: 'previews' | 'files' = 'files'
): Promise<SignedUploadUrlResult> {
  const safeName =
    (fileName || 'arquivo')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+/, '')
      .slice(0, 100) || 'arquivo'
  const key = `${folder}/${Date.now()}-${safeName}`

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  // Generates a pre-signed PUT URL valid for 15 minutes (900 seconds)
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })

  let url: string
  if (isPrivateAsset(fileName)) {
    url = key
  } else {
    const publicUrl = process.env.R2_PUBLIC_URL || ''
    url = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${key}` : `/api/r2-mock/${key}`
  }

  return {
    uploadUrl,
    key,
    url,
  }
}
