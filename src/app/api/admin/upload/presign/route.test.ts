import { describe, it, expect, beforeEach, vi } from 'vitest'

const { protectArtworkManagementRoute, getSignedUploadUrl } = vi.hoisted(() => ({
  protectArtworkManagementRoute: vi.fn(),
  getSignedUploadUrl: vi.fn(),
}))

vi.mock('@/lib/auth/middleware', () => ({
  protectArtworkManagementRoute: () => protectArtworkManagementRoute(),
}))
vi.mock('@/lib/r2/signed-url', () => ({ getSignedUploadUrl: (...args: unknown[]) => getSignedUploadUrl(...args) }))

import { POST } from './route'

function buildJsonRequest(body: unknown) {
  return new Request('http://localhost/api/admin/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  protectArtworkManagementRoute.mockResolvedValue({ authorized: true, user: { id: 'admin' } })
  getSignedUploadUrl.mockResolvedValue({
    uploadUrl: 'https://r2.cloudflarestorage.com/upload-url',
    key: 'files/123-design.cdr',
    url: 'files/123-design.cdr',
  })
})

describe('POST /api/admin/upload/presign', () => {
  it('bloqueia quando não autorizado', async () => {
    protectArtworkManagementRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 403 }),
    })
    const res = await POST(
      buildJsonRequest({
        fileName: 'design.cdr',
        contentType: 'application/octet-stream',
        size: 1024,
      })
    )
    expect(res.status).toBe(403)
    expect(getSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('permite geração de URL pré-assinada para usuário FASE', async () => {
    protectArtworkManagementRoute.mockResolvedValue({
      authorized: true,
      user: { id: 'fase-1', role: 'FASE' },
    })
    const res = await POST(
      buildJsonRequest({
        fileName: 'design.cdr',
        contentType: 'application/octet-stream',
        size: 1024,
      })
    )
    expect(res.status).toBe(200)
    expect(getSignedUploadUrl).toHaveBeenCalled()
  })

  it('rejeita requisição com JSON inválido ou campos ausentes', async () => {
    const res = await POST(buildJsonRequest({}))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(getSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('rejeita extensão não permitida (ex: .exe)', async () => {
    const res = await POST(
      buildJsonRequest({
        fileName: 'malware.exe',
        contentType: 'application/x-msdownload',
        size: 2048,
      })
    )
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/Formato não permitido/)
    expect(getSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('rejeita arquivo acima de 50 MB', async () => {
    const res = await POST(
      buildJsonRequest({
        fileName: 'big.cdr',
        contentType: 'application/octet-stream',
        size: 51 * 1024 * 1024,
      })
    )
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/50 MB/)
    expect(getSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('gera url pré-assinada com sucesso para arquivo válido', async () => {
    const res = await POST(
      buildJsonRequest({
        fileName: '001 JV MOTOS.cdr',
        contentType: 'application/octet-stream',
        size: 46 * 1024 * 1024,
        folder: 'files',
      })
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.uploadUrl).toBe('https://r2.cloudflarestorage.com/upload-url')
    expect(getSignedUploadUrl).toHaveBeenCalledWith(
      '001 JV MOTOS.cdr',
      'application/octet-stream',
      'files'
    )
  })
})
