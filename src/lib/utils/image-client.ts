/**
 * Utilitário de otimização de imagem no navegador (client-side).
 *
 * Imagens de capa e preview enviadas ao backend passam por rotas de API que,
 * em plataformas serverless como a Vercel, têm limite estrito de payload (4.5 MB).
 * Designers frequentemente exportam mockups em PNG em altíssima resolução (ex: 5000x5000px, 10-30 MB).
 * Esta função redimensiona e comprime transparentemente no navegador imagens acima de 3.5 MB,
 * garantindo qualidade ideal para telas Retina/web (até 2048px) sem estourar o limite de 4.5 MB (HTTP 413).
 */
export async function optimizeImageForUpload(
  file: File,
  options?: {
    maxDimension?: number
    maxSizeInBytes?: number
    quality?: number
  }
): Promise<File> {
  const maxDimension = options?.maxDimension ?? 2048
  const maxSizeInBytes = options?.maxSizeInBytes ?? 3.5 * 1024 * 1024
  const quality = options?.quality ?? 0.88

  // Não executa fora do navegador ou se não for uma imagem comum
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !file.type?.startsWith('image/')
  ) {
    return file
  }

  // Se já for menor que o limite seguro (3.5 MB), não precisa recomprimir
  if (file.size <= maxSizeInBytes) {
    return file
  }

  return new Promise<File>((resolve) => {
    // Se a API de URL ou Image não estiver disponível, devolve original
    if (typeof URL === 'undefined' || typeof Image === 'undefined') {
      resolve(file)
      return
    }

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Preserva proporção respeitando a dimensão máxima
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }

          // Se mesmo redimensionado como PNG o arquivo ficar > 4 MB,
          // converte para JPEG para garantir que caiba com folga no limite da Vercel (4.5 MB)
          if (blob.size > 4 * 1024 * 1024 && file.type === 'image/png') {
            canvas.toBlob(
              (jpgBlob) => {
                if (jpgBlob && jpgBlob.size < blob.size) {
                  const newFileName = file.name.replace(/\.[^.]+$/, '.jpg')
                  resolve(new File([jpgBlob], newFileName, { type: 'image/jpeg' }))
                } else {
                  resolve(new File([blob], file.name, { type: 'image/png' }))
                }
              },
              'image/jpeg',
              quality
            )
            return
          }

          resolve(new File([blob], file.name, { type: blob.type }))
        },
        outputMime,
        outputMime === 'image/jpeg' ? quality : undefined
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      // Fallback gracioso: se o navegador falhar ao renderizar a imagem, mantém o original
      resolve(file)
    }

    img.src = objectUrl
  })
}
