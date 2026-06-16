import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { applyWatermark } from './index'

describe('applyWatermark', () => {
  it('should return a different buffer after applying watermark', async () => {
    // Create a simple test image (100x100 white PNG)
    const testImage = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
    }).png().toBuffer()

    const watermarked = await applyWatermark(testImage, 'image/png')
    expect(watermarked).not.toEqual(testImage)
    expect(watermarked.length).toBeGreaterThan(0)
  })

  it('should preserve image dimensions', async () => {
    const testImage = await sharp({
      create: { width: 200, height: 150, channels: 3, background: { r: 128, g: 128, b: 128 } }
    }).jpeg().toBuffer()

    const watermarked = await applyWatermark(testImage, 'image/jpeg')
    const metadata = await sharp(watermarked).metadata()
    expect(metadata.width).toBe(200)
    expect(metadata.height).toBe(150)
  })
})
