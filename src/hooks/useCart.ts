'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CartResponse } from '@/types/cart'

/**
 * Hook que gerencia o estado do carrinho consumindo /api/cart.
 *
 * Comportamento:
 * - Carrega o carrinho na primeira montagem.
 * - Mantém `itemCount` em sincronia com `cart.items.length` para alimentar o
 *   badge do header e checagens de "já está no carrinho" no card.
 * - Todas as mutações (add/remove/clear) já atualizam o estado local com a
 *   resposta do servidor — evita um refresh extra logo após a ação.
 */
export function useCart() {
  const [cart, setCart] = useState<CartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [itemCount, setItemCount] = useState(0)

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart')
      const result = await res.json()
      if (result.success) {
        setCart(result.data)
        setItemCount(result.data.items?.length ?? 0)
      }
    } catch {
      /* erro de rede — mantém o estado anterior, o caller decide se mostra erro */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const addToCart = useCallback(async (artworkId: string) => {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId }),
      })
      const result = await res.json()
      if (result.success) {
        setCart(result.data)
        setItemCount(result.data.items?.length ?? 0)
        return { success: true, error: null as string | null }
      }
      return { success: false, error: (result.error as string) ?? 'Não foi possível adicionar ao carrinho.' }
    } catch {
      return { success: false, error: 'Falha na comunicação com o servidor.' }
    }
  }, [])

  const removeFromCart = useCallback(async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setCart(result.data)
        setItemCount(result.data.items?.length ?? 0)
      }
    } catch {
      /* silencioso — UI mostra estado anterior */
    }
  }, [])

  const clearCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart', { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setCart(result.data)
        setItemCount(0)
      }
    } catch {
      /* silencioso */
    }
  }, [])

  /** Helper para checagens em componentes (ex: badge "No carrinho ✓"). */
  const isInCart = useCallback(
    (artworkId: string) => cart?.items?.some((i) => i.artworkId === artworkId) ?? false,
    [cart]
  )

  return { cart, loading, itemCount, addToCart, removeFromCart, clearCart, refreshCart, isInCart }
}
