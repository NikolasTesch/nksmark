import { describe, it, expect, beforeEach, vi } from 'vitest'

const { protectAdminRoute, uploadFileToR2 } = vi.hoisted(() => ({
  protectAdminRoute: vi.fn(),
  uploadFileToR2: vi.fn(),
}))

vi.mock('@/lib/auth/middleware', () => ({ protectAdminRoute: () => protectAdminRoute() }))
vi.mock('@/lib/r2/upload', () => ({ uploadFileToR2: uploadFileToR2 }))

import { POST } from './route'

function buildRequest(file: File | null, folder = 'files') {
  const form = new FormData()
  if (file) form.set('file', file)
  form.set('folder', folder)
  return new Request('http://localhost/api/admin/upload', { method: 'POST', body: form })
}

beforeEach(() => {
  vi.clearAllMocks()
  protectAdminRoute.mockResolvedValue({ authorized: true, user: { id: 'admin' } })
  uploadFileToR2.mockResolvedValue({ url: 'files/k', key: 'files/k', size: 3 })
})

describe('POST /api/admin/upload', () => {
  it('bloqueia quando não é admin', async () => {
    protectAdminRoute.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 403 }),
    })
    const res = await POST(buildRequest(new File(['x'], 'a.png', { type: 'image/png' })))
    expect(res.status).toBe(403)
    expect(uploadFileToR2).not.toHaveBeenCalled()
  })

  it('rejeita extensão não permitida (ex: .exe)', async () => {
    const res = await POST(buildRequest(new File(['x'], 'malware.exe', { type: 'application/octet-stream' })))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(uploadFileToR2).not.toHaveBeenCalled()
  })

  it('rejeita arquivo acima de 50 MB', async () => {
    const big = new File([new Uint8Array(51 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' })
    const res = await POST(buildRequest(big))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toMatch(/50 MB/)
    expect(uploadFileToR2).not.toHaveBeenCalled()
  })

  it('aceita formato válido e delega ao uploader', async () => {
    const res = await POST(buildRequest(new File(['x'], 'design.cdr', { type: 'application/octet-stream' })))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(uploadFileToR2).toHaveBeenCalledOnce()
  })

  it('normaliza folder inválido para "files"', async () => {
    await POST(buildRequest(new File(['x'], 'design.cdr', { type: 'application/octet-stream' }), '../evil'))
    expect(uploadFileToR2).toHaveBeenCalledWith(expect.anything(), 'design.cdr', expect.anything(), 'files')
  })
})
