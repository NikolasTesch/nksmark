import sharp from 'sharp'
import { generateWatermarkSVG } from './svg-template'

/**
 * Aplica watermark "NKS Art" em uma imagem buffer.
 * @param buffer - Buffer da imagem original
 * @param mimeType - Tipo MIME (image/png, image/jpeg)
 * @returns Buffer com watermark aplicado
 * @throws Se sharp falhar, propaga o erro para o handler (que faz graceful degradation)
 */
export async function applyWatermark(buffer: Buffer, _mimeType: string): Promise<Buffer> {
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
}
