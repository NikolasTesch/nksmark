import { describe, it, expect } from 'vitest'
import { optimizeImageForUpload } from './image-client'

describe('optimizeImageForUpload', () => {
  it('retorna o mesmo arquivo se não for imagem', async () => {
    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' })
    const result = await optimizeImageForUpload(file)
    expect(result).toBe(file)
  })

  it('retorna o mesmo arquivo se o tamanho for menor ou igual a 3.5 MB', async () => {
    const smallContent = new Uint8Array(1024)
    const file = new File([smallContent], 'cover.png', { type: 'image/png' })
    const result = await optimizeImageForUpload(file)
    expect(result).toBe(file)
  })
})
