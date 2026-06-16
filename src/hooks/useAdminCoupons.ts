'use client'

import { useState, useEffect, useCallback } from 'react'

export type DiscountType = 'PERCENTAGE' | 'FIXED'

export interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: DiscountType
  discountValue: number
  minPurchaseCents: number | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCouponPayload {
  code: string
  description?: string
  discountType: DiscountType
  discountValue: number
  minPurchaseCents?: number
  maxUses?: number
  expiresAt?: string
  isActive?: boolean
}

export interface UpdateCouponPayload {
  code?: string
  description?: string | null
  discountType?: DiscountType
  discountValue?: number
  minPurchaseCents?: number | null
  maxUses?: number | null
  expiresAt?: string | null
  isActive?: boolean
}

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

async function parseResponse(res: Response): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const body = await res.json()
    if (res.ok && body?.success) return { ok: true, data: body.data }
    return { ok: false, error: body?.error || `Erro HTTP ${res.status}` }
  } catch {
    return { ok: false, error: `Erro HTTP ${res.status}` }
  }
}

export function useAdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' })
      const parsed = await parseResponse(res)
      if (parsed.ok) {
        setCoupons(Array.isArray(parsed.data) ? (parsed.data as Coupon[]) : [])
      } else {
        setError(parsed.error || 'Erro ao carregar cupons.')
      }
    } catch (err) {
      console.error(err)
      setError('Erro de conexão ao carregar cupons.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial on-mount (sincroniza com a API)
    fetchCoupons()
  }, [fetchCoupons])

  const createCoupon = useCallback(
    async (payload: CreateCouponPayload): Promise<ActionResult<Coupon>> => {
      try {
        const res = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const parsed = await parseResponse(res)
        if (parsed.ok && parsed.data) {
          const created = parsed.data as Coupon
          setCoupons((prev) => [created, ...prev])
          return { success: true, data: created }
        }
        return { success: false, error: parsed.error || 'Erro ao criar cupom.' }
      } catch (err) {
        console.error(err)
        return { success: false, error: 'Erro de conexão ao criar cupom.' }
      }
    },
    [],
  )

  const updateCoupon = useCallback(
    async (id: string, payload: UpdateCouponPayload): Promise<ActionResult<Coupon>> => {
      try {
        const res = await fetch(`/api/admin/coupons/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const parsed = await parseResponse(res)
        if (parsed.ok && parsed.data) {
          const updated = parsed.data as Coupon
          setCoupons((prev) => prev.map((c) => (c.id === id ? updated : c)))
          return { success: true, data: updated }
        }
        return { success: false, error: parsed.error || 'Erro ao atualizar cupom.' }
      } catch (err) {
        console.error(err)
        return { success: false, error: 'Erro de conexão ao atualizar cupom.' }
      }
    },
    [],
  )

  const toggleActive = useCallback(
    async (coupon: Coupon): Promise<ActionResult<Coupon>> => {
      return updateCoupon(coupon.id, { isActive: !coupon.isActive })
    },
    [updateCoupon],
  )

  const deleteCoupon = useCallback(
    async (id: string, force = false): Promise<ActionResult<{ id: string }>> => {
      try {
        const url = force ? `/api/admin/coupons/${id}?force=true` : `/api/admin/coupons/${id}`
        const res = await fetch(url, { method: 'DELETE' })
        const parsed = await parseResponse(res)
        if (parsed.ok) {
          setCoupons((prev) => prev.filter((c) => c.id !== id))
          return { success: true, data: { id } }
        }
        return { success: false, error: parsed.error || 'Erro ao excluir cupom.' }
      } catch (err) {
        console.error(err)
        return { success: false, error: 'Erro de conexão ao excluir cupom.' }
      }
    },
    [],
  )

  return {
    coupons,
    loading,
    error,
    refresh: fetchCoupons,
    createCoupon,
    updateCoupon,
    toggleActive,
    deleteCoupon,
  }
}
