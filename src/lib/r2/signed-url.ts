import { GetObjectCommand } from '@aws-sdk/client-s3'
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
