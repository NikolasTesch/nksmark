import { generateWatermarkSVG } from './svg-template'

async function getSharp() {
  try {
    const sharpModule = await import('sharp')
    return sharpModule.default || sharpModule
  } catch (error) {
    console.warn('[Watermark] Failed to load sharp module:', error)
    return null
  }
}

/**
 * Aplica watermark "NKS Art" em uma imagem buffer.
 * @param buffer - Buffer da imagem original
 * @param mimeType - Tipo MIME (image/png, image/jpeg)
 * @returns Buffer com watermark aplicado (ou original se sharp não estiver disponível)
 */
export async function applyWatermark(buffer: Buffer, _mimeType?: string): Promise<Buffer> {
  void _mimeType
  const sharp = await getSharp()
  if (!sharp) {
    return buffer
  }

  try {
    const metadata = await sharp(buffer).metadata()
    const svgWidth = metadata.width ?? 400
    const svgHeight = metadata.height ?? 400
    const svgOverlay = Buffer.from(generateWatermarkSVG(svgWidth, svgHeight))

    const result = await sharp(buffer)
      .withMetadata()
      .composite([
        {
          input: svgOverlay,
          top: 0,
          left: 0,
          blend: 'over',
        },
      ])
      .toBuffer()

    return result as unknown as Buffer
  } catch (error) {
    console.warn('[Watermark] Failed to process image with sharp, returning original buffer:', error)
    return buffer
  }
}
