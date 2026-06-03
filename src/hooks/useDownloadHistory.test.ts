// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDownloadHistory } from './useDownloadHistory'

const mockItem = {
  id: 'dl-1',
  artworkId: 'art-1',
  artworkSlug: 'minha-arte',
  artworkTitle: 'Minha Arte',
  previewUrl: 'https://cdn.example/preview.jpg',
  format: 'CDR',
  downloadedAt: '2026-06-01T10:00:00.000Z',
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useDownloadHistory', () => {
  it('inicia com loading=true e resolve para loading=false após a resposta', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    } as Response)

    const { result } = renderHook(() => useDownloadHistory())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('popula history com os dados retornados pela API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [mockItem] }),
    } as Response)

    const { result } = renderHook(() => useDownloadHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].id).toBe('dl-1')
    expect(result.current.error).toBeUndefined()
  })

  it('seta error e history=[] quando fetch lança erro de rede', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useDownloadHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.history).toHaveLength(0)
    expect(result.current.error).toBe('Falha na comunicação com o servidor.')
  })

  it('seta error quando a API retorna success=false', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Não autorizado.' }),
    } as Response)

    const { result } = renderHook(() => useDownloadHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.history).toHaveLength(0)
    expect(result.current.error).toBe('Não autorizado.')
  })

  it('refresh() re-executa o fetch e atualiza history', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [mockItem] }),
      } as Response)

    const { result } = renderHook(() => useDownloadHistory())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.history).toHaveLength(0)

    await act(() => result.current.refresh())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.history).toHaveLength(1)
  })

  it('não lê nem escreve em localStorage', async () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem')
    const setSpy = vi.spyOn(Storage.prototype, 'setItem')
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem')

    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [mockItem] }),
    } as Response)

    const { result } = renderHook(() => useDownloadHistory())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getSpy).not.toHaveBeenCalled()
    expect(setSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()
  })
})
