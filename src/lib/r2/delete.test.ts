import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))

vi.mock('./client', () => ({
  s3Client: { send: sendMock },
  R2_BUCKET_NAME: 'test-bucket',
  R2_PUBLIC_URL: 'https://pub.example.com',
}))

import { extractR2Key, moveObjectToDeleted, moveArtworkFilesToDeleted } from './delete'

beforeEach(() => {
  vi.clearAllMocks()
  sendMock.mockResolvedValue({})
  process.env.R2_PUBLIC_URL = 'https://pub.example.com'
})

describe('extractR2Key', () => {
  it('extrai a chave a partir de arquivos privados (chave pura)', () => {
    expect(extractR2Key('files/123-arte.cdr')).toBe('files/123-arte.cdr')
  })

  it('extrai a chave a partir de URLs públicas completas de files', () => {
    expect(extractR2Key('https://pub.example.com/files/123-vetor.ai')).toBe('files/123-vetor.ai')
  })

  it('extrai a chave a partir de URLs de previews/capa', () => {
    expect(extractR2Key('https://pub.example.com/previews/123-capa.jpg')).toBe('previews/123-capa.jpg')
  })

  it('mantém a chave se já estiver na pasta deleted/', () => {
    expect(extractR2Key('deleted/files/123-arte.cdr')).toBe('deleted/files/123-arte.cdr')
  })

  it('trata rotas de mock local', () => {
    expect(extractR2Key('/api/r2-mock/previews/123-capa.jpg')).toBe('previews/123-capa.jpg')
  })
})

describe('moveObjectToDeleted', () => {
  it('envia CopyObjectCommand e DeleteObjectCommand para mover para deleted/', async () => {
    const newKey = await moveObjectToDeleted('files/123-arte.cdr')

    expect(newKey).toBe('deleted/files/123-arte.cdr')
    expect(sendMock).toHaveBeenCalledTimes(2)

    const copyCall = sendMock.mock.calls[0][0]
    expect(copyCall).toBeInstanceOf(CopyObjectCommand)
    expect(copyCall.input).toEqual({
      Bucket: 'test-bucket',
      CopySource: 'test-bucket/files/123-arte.cdr',
      Key: 'deleted/files/123-arte.cdr',
    })

    const deleteCall = sendMock.mock.calls[1][0]
    expect(deleteCall).toBeInstanceOf(DeleteObjectCommand)
    expect(deleteCall.input).toEqual({
      Bucket: 'test-bucket',
      Key: 'files/123-arte.cdr',
    })
  })

  it('não realiza movimentação se o arquivo já estiver na pasta deleted/', async () => {
    const key = await moveObjectToDeleted('deleted/files/123-arte.cdr')
    expect(key).toBe('deleted/files/123-arte.cdr')
    expect(sendMock).not.toHaveBeenCalled()
  })
})

describe('moveArtworkFilesToDeleted', () => {
  it('move todos os arquivos vinculados e o previewUrl para deleted/', async () => {
    const artwork = {
      previewUrl: 'https://pub.example.com/previews/capa.jpg',
      files: [
        { id: 'f1', url: 'files/123-arte.cdr' },
        { id: 'f2', url: 'https://pub.example.com/files/123-mockup.png' },
      ],
    }

    const result = await moveArtworkFilesToDeleted(artwork)

    expect(result.newPreviewUrl).toBe('https://pub.example.com/deleted/previews/capa.jpg')
    expect(result.updatedFiles).toEqual([
      { id: 'f1', newUrl: 'deleted/files/123-arte.cdr' },
      { id: 'f2', newUrl: 'deleted/files/123-mockup.png' },
    ])
    // 2 comandos para cada um dos 3 itens = 6 chamadas
    expect(sendMock).toHaveBeenCalledTimes(6)
  })
})
