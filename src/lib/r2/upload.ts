import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3Client, R2_BUCKET_NAME } from './client'

export interface UploadResult {
  url: string
  key: string
  size: number
}

export async function uploadFileToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder: 'previews' | 'files' = 'files'
): Promise<UploadResult> {
  const key = `${folder}/${Date.now()}-${fileName}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  )

  const publicUrl = process.env.R2_PUBLIC_URL || ''
  const url = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${key}` : `/api/r2-mock/${key}`

  return {
    url,
    key,
    size: fileBuffer.length,
  }
}
