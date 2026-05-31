import { describe, it, expect, beforeEach, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))

vi.mock('./client', () => ({
  s3Client: { send: sendMock },
  R2_BUCKET_NAME: 'test-bucket',
  R2_PUBLIC_URL: '',
}))

import { uploadFileToR2 } from './upload'

beforeEach(() => {
  vi.clearAllMocks()
  sendMock.mockResolvedValue({})
  process.env.R2_PUBLIC_URL = 'https://pub.example.com'
})

describe('uploadFileToR2 — visibilidade por formato', () => {
  it('NÃO gera URL pública para vetores originais (.cdr) — guarda só a key', async () => {
    const res = await uploadFileToR2(Buffer.from('x'), 'design.cdr', 'application/octet-stream', 'files')
    expect(res.url).toBe(res.key)
    expect(res.url.startsWith('https://')).toBe(false)
    expect(res.key).toMatch(/^files\/\d+-design\.cdr$/)
  })

  it('aplica a mesma proteção para .ai, .pdf e .otf', async () => {
    for (const name of ['arte.ai', 'manual.pdf', 'fonte.otf']) {
      const res = await uploadFileToR2(Buffer.from('x'), name, 'application/octet-stream', 'files')
      expect(res.url).toBe(res.key)
      expect(res.url.startsWith('https://')).toBe(false)
    }
  })

  it('gera URL pública para mockups (.png) usados na galeria', async () => {
    const res = await uploadFileToR2(Buffer.from('x'), 'mockup.png', 'image/png', 'files')
    expect(res.url).toBe(`https://pub.example.com/${res.key}`)
  })

  it('gera URL pública para a capa em previews/', async () => {
    const res = await uploadFileToR2(Buffer.from('x'), 'capa.jpg', 'image/jpeg', 'previews')
    expect(res.url).toBe(`https://pub.example.com/${res.key}`)
  })
})

describe('uploadFileToR2 — sanitização do nome (input público)', () => {
  it('neutraliza tentativa de path traversal no nome do arquivo', async () => {
    const res = await uploadFileToR2(Buffer.from('x'), '../../files/evil.png', 'image/png', 'previews')
    // Sem barras no nome → a key não ganha segmentos de path além do prefixo da
    // pasta; o conteúdo continua confinado em previews/ (traversal neutralizado).
    expect(res.key).toMatch(/^previews\/\d+-[a-zA-Z0-9._-]+$/)
    expect(res.key.split('/').length).toBe(2)
    const namePart = res.key.split('/')[1]
    expect(namePart).not.toContain('/')
  })

  it('substitui caracteres inválidos/espaços por underscore', async () => {
    const res = await uploadFileToR2(Buffer.from('x'), 'a b@c#d.png', 'image/png', 'previews')
    expect(res.key).toMatch(/^previews\/\d+-a_b_c_d\.png$/)
  })

  it('não quebra quando o nome fica vazio após sanitizar', async () => {
    const res = await uploadFileToR2(Buffer.from('x'), '@@@', 'image/png', 'previews')
    expect(res.key).toMatch(/^previews\/\d+-_{3}$/)
  })

  it('limita o tamanho do nome a 100 caracteres', async () => {
    const longName = 'a'.repeat(300) + '.png'
    const res = await uploadFileToR2(Buffer.from('x'), longName, 'image/png', 'previews')
    const namePart = res.key.split('-').slice(1).join('-')
    expect(namePart.length).toBeLessThanOrEqual(100)
  })
})
