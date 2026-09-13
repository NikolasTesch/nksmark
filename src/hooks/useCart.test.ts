// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCart } from './useCart'

const cartWithItem = {
  items: [
    {
      id: 'item-1',
      artworkId: 'art-1',
      artwork: { id: 'art-1', title: 'A', slug: 'a', previewUrl: '', priceCents: 0 },
    },
  ],
  totalCents: 0,
}

const emptyCart = { items: [], totalCents: 0 }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useCart', () => {
  it('inicia loading=true e popula cart/itemCount após refresh', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: cartWithItem }),
    } as Response)

    const { result } = renderHook(() => useCart())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.cart?.items).toHaveLength(1)
    expect(result.current.itemCount).toBe(1)
  })

  it('mantém estado e loading=false quando refresh lança erro de rede', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCart())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.cart).toBeNull()
    expect(result.current.itemCount).toBe(0)
  })

  it('addToCart success atualiza estado e retorna {success:true,error:null}', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: emptyCart }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: cartWithItem }),
      } as Response)

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: { success: boolean; error: string | null } | undefined
    await act(async () => {
      res = await result.current.addToCart('art-1')
    })

    expect(res).toEqual({ success: true, error: null })
    expect(result.current.cart?.items).toHaveLength(1)
    expect(result.current.itemCount).toBe(1)
  })

  it('addToCart retorna {success:false,error} quando API success=false', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: emptyCart }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'Sem estoque.' }),
      } as Response)

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: { success: boolean; error: string | null } | undefined
    await act(async () => {
      res = await result.current.addToCart('art-1')
    })

    expect(res).toEqual({ success: false, error: 'Sem estoque.' })
  })

  it('addToCart retorna {success:false,error} em erro de rede', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: emptyCart }),
      } as Response)
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: { success: boolean; error: string | null } | undefined
    await act(async () => {
      res = await result.current.addToCart('art-1')
    })

    expect(res).toEqual({ success: false, error: 'Falha na comunicação com o servidor.' })
  })

  it('removeFromCart success remove o item e atualiza itemCount', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: cartWithItem }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: emptyCart }),
      } as Response)

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.itemCount).toBe(1))

    await act(async () => {
      await result.current.removeFromCart('item-1')
    })

    expect(result.current.cart?.items).toHaveLength(0)
    expect(result.current.itemCount).toBe(0)
  })

  it('removeFromCart silencia erro de rede e mantém estado', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: cartWithItem }),
      } as Response)
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.itemCount).toBe(1))

    await act(async () => {
      await result.current.removeFromCart('item-1')
    })

    expect(result.current.itemCount).toBe(1)
  })

  it('clearCart success zera itemCount', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: cartWithItem }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: cartWithItem }),
      } as Response)

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.itemCount).toBe(1))

    await act(async () => {
      await result.current.clearCart()
    })

    expect(result.current.itemCount).toBe(0)
  })

  it('clearCart silencia erro de rede', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: cartWithItem }),
      } as Response)
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.itemCount).toBe(1))

    await act(async () => {
      await result.current.clearCart()
    })

    expect(result.current.itemCount).toBe(1)
  })

  it('isInCart detecta presença/ausência por artworkId', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: cartWithItem }),
    } as Response)

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isInCart('art-1')).toBe(true)
    expect(result.current.isInCart('art-99')).toBe(false)
  })

  it('não persiste em localStorage', async () => {
    const getSpy = vi.spyOn(Storage.prototype, 'getItem')
    const setSpy = vi.spyOn(Storage.prototype, 'setItem')
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem')

    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ success: true, data: emptyCart }),
    } as Response)

    const { result } = renderHook(() => useCart())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.addToCart('art-1')
    })

    expect(getSpy).not.toHaveBeenCalled()
    expect(setSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()
  })
})
