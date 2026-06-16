'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, AlertCircle } from 'lucide-react'
import {
  Coupon,
  CreateCouponPayload,
  DiscountType,
  UpdateCouponPayload,
} from '@/hooks/useAdminCoupons'

interface CouponFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialCoupon?: Coupon | null
  onSubmitCreate: (payload: CreateCouponPayload) => Promise<{ success: boolean; error?: string }>
  onSubmitEdit: (
    id: string,
    payload: UpdateCouponPayload,
  ) => Promise<{ success: boolean; error?: string }>
  onSuccess?: (coupon: Coupon) => void
}

interface FormState {
  code: string
  description: string
  discountType: DiscountType
  /** Display value: percentage (1-100) or BRL (e.g. 5.00). */
  displayValue: string
  minPurchase: string
  maxUses: string
  expiresAt: string // YYYY-MM-DD
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  displayValue: '',
  minPurchase: '',
  maxUses: '',
  expiresAt: '',
  isActive: true,
}

/** Convert BRL string ("5,00") → cents integer (500). Returns null on invalid. */
function parseBRLToCents(input: string): number | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.')
  if (cleaned === '' || isNaN(Number(cleaned))) return null
  const num = Number(cleaned)
  if (num < 0) return null
  return Math.round(num * 100)
}

/** Convert cents integer (500) → BRL string ("5.00") for editing. */
function formatCentsToBRL(cents: number | null | undefined): string {
  if (cents == null) return ''
  return (cents / 100).toFixed(2)
}

/** Convert ISO datetime → YYYY-MM-DD for <input type="date">. */
function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch {
    return ''
  }
}

function validate(form: FormState): { ok: boolean; errors: Partial<Record<keyof FormState, string>> } {
  const errors: Partial<Record<keyof FormState, string>> = {}

  const code = form.code.trim()
  if (!code) {
    errors.code = 'Código é obrigatório.'
  } else if (code.length < 3) {
    errors.code = 'O código deve ter pelo menos 3 caracteres.'
  } else if (code.length > 30) {
    errors.code = 'O código deve ter no máximo 30 caracteres.'
  }

  const valueNum = Number(form.displayValue.replace(',', '.'))
  if (form.displayValue === '' || isNaN(valueNum)) {
    errors.displayValue = 'Valor é obrigatório.'
  } else if (valueNum <= 0) {
    errors.displayValue = 'O valor deve ser positivo.'
  } else if (form.discountType === 'PERCENTAGE' && (valueNum < 1 || valueNum > 100)) {
    errors.displayValue = 'Percentagem deve estar entre 1 e 100.'
  }

  if (form.minPurchase) {
    const cents = parseBRLToCents(form.minPurchase)
    if (cents === null || cents < 0) {
      errors.minPurchase = 'Valor mínimo inválido.'
    }
  }

  if (form.maxUses) {
    const n = Number(form.maxUses)
    if (!Number.isInteger(n) || n < 1) {
      errors.maxUses = 'Limite deve ser inteiro ≥ 1.'
    }
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

export function CouponFormDialog({
  open,
  onOpenChange,
  mode,
  initialCoupon,
  onSubmitCreate,
  onSubmitEdit,
  onSuccess,
}: CouponFormDialogProps) {
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // Reset / hydrate form when the dialog opens
  React.useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initialCoupon) {
      setForm({
        code: initialCoupon.code,
        description: initialCoupon.description ?? '',
        discountType: initialCoupon.discountType,
        displayValue:
          initialCoupon.discountType === 'PERCENTAGE'
            ? String(initialCoupon.discountValue)
            : formatCentsToBRL(initialCoupon.discountValue),
        minPurchase: formatCentsToBRL(initialCoupon.minPurchaseCents),
        maxUses: initialCoupon.maxUses != null ? String(initialCoupon.maxUses) : '',
        expiresAt: isoToDateInput(initialCoupon.expiresAt),
        isActive: initialCoupon.isActive,
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
    setSubmitError(null)
  }, [open, mode, initialCoupon])

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setSubmitError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = validate(form)
    setErrors(result.errors)
    if (!result.ok) return

    setSubmitting(true)
    setSubmitError(null)

    const valueNum = Number(form.displayValue.replace(',', '.'))
    const valueApi =
      form.discountType === 'PERCENTAGE' ? Math.round(valueNum) : Math.round(valueNum * 100)

    const rawMinCents = form.minPurchase ? parseBRLToCents(form.minPurchase) : undefined
    const minCents: number | undefined = rawMinCents ?? undefined
    const maxUsesNum = form.maxUses ? Number(form.maxUses) : undefined
    // Date → end of day in ISO
    const expiresIso = form.expiresAt
      ? new Date(`${form.expiresAt}T23:59:59.999Z`).toISOString()
      : undefined

    if (mode === 'create') {
      const payload: CreateCouponPayload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue: valueApi,
        minPurchaseCents: minCents,
        maxUses: maxUsesNum,
        expiresAt: expiresIso,
        isActive: form.isActive,
      }
      const res = await onSubmitCreate(payload)
      setSubmitting(false)
      if (res.success) {
        onOpenChange(false)
        // Caller will already have updated list. We pass a synthetic object just for callback parity.
        if (onSuccess) {
          onSuccess({
            ...payload,
            id: '',
            usedCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            minPurchaseCents: payload.minPurchaseCents ?? null,
            maxUses: payload.maxUses ?? null,
            expiresAt: payload.expiresAt ?? null,
            description: payload.description ?? null,
            isActive: payload.isActive ?? true,
          })
        }
      } else {
        setSubmitError(res.error || 'Erro ao criar cupom.')
      }
    } else {
      if (!initialCoupon) {
        setSubmitting(false)
        setSubmitError('Cupom não encontrado para edição.')
        return
      }
      const payload: UpdateCouponPayload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue: valueApi,
        minPurchaseCents: minCents ?? null,
        maxUses: maxUsesNum ?? null,
        expiresAt: expiresIso ?? null,
        isActive: form.isActive,
      }
      const res = await onSubmitEdit(initialCoupon.id, payload)
      setSubmitting(false)
      if (res.success) {
        onOpenChange(false)
        onSuccess?.(initialCoupon)
      } else {
        setSubmitError(res.error || 'Erro ao atualizar cupom.')
      }
    }
  }

  const title = mode === 'create' ? 'Novo cupom' : 'Editar cupom'
  const description =
    mode === 'create'
      ? 'Crie um novo cupom de desconto para a loja.'
      : 'Atualize as informações deste cupom.'
  const submitLabel = mode === 'create' ? 'Criar cupom' : 'Salvar alterações'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2" noValidate>
          {/* Código + Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Código <span className="text-nks-red">*</span>
              </label>
              <Input
                type="text"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="EX: NKS10"
                maxLength={30}
                className="rounded-sm font-mono uppercase"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!errors.code}
              />
              {errors.code && (
                <span className="text-[10px] font-semibold text-nks-red">{errors.code}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Tipo
              </label>
              <select
                value={form.discountType}
                onChange={(e) => handleChange('discountType', e.target.value as DiscountType)}
                className="w-full rounded-sm border border-nks-gray-200 bg-white px-3.5 py-2.5 text-xs text-nks-black focus:outline-none focus:ring-1 focus:ring-nks-red focus:border-nks-red cursor-pointer font-semibold"
              >
                <option value="PERCENTAGE">Percentagem (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
              Descrição
            </label>
            <Input
              type="text"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Ex: 10% off na primeira compra"
              maxLength={120}
              className="rounded-sm"
            />
          </div>

          {/* Valor + Valor mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Valor {form.discountType === 'PERCENTAGE' ? '(%)' : '(R$)'}{' '}
                <span className="text-nks-red">*</span>
              </label>
              <Input
                type="number"
                inputMode="decimal"
                step={form.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                min={form.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                value={form.displayValue}
                onChange={(e) => handleChange('displayValue', e.target.value)}
                placeholder={form.discountType === 'PERCENTAGE' ? '10' : '5,00'}
                className="rounded-sm"
                aria-invalid={!!errors.displayValue}
              />
              {errors.displayValue && (
                <span className="text-[10px] font-semibold text-nks-red">
                  {errors.displayValue}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Valor mínimo da compra (R$)
              </label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.minPurchase}
                onChange={(e) => handleChange('minPurchase', e.target.value)}
                placeholder="Opcional"
                className="rounded-sm"
                aria-invalid={!!errors.minPurchase}
              />
              {errors.minPurchase && (
                <span className="text-[10px] font-semibold text-nks-red">
                  {errors.minPurchase}
                </span>
              )}
            </div>
          </div>

          {/* Limite de usos + Data de expiração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Limite de usos
              </label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={form.maxUses}
                onChange={(e) => handleChange('maxUses', e.target.value)}
                placeholder="Ilimitado"
                className="rounded-sm"
                aria-invalid={!!errors.maxUses}
              />
              {errors.maxUses && (
                <span className="text-[10px] font-semibold text-nks-red">{errors.maxUses}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-nks-black tracking-wider">
                Data de expiração
              </label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => handleChange('expiresAt', e.target.value)}
                className="rounded-sm"
              />
            </div>
          </div>

          {/* Ativo checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="h-4 w-4 rounded-sm border-nks-gray-200 text-nks-red focus:ring-nks-red cursor-pointer accent-nks-red"
            />
            <span className="text-xs font-bold text-nks-black uppercase tracking-wider">
              Cupom ativo
            </span>
            <span className="text-[10px] text-nks-gray-400 font-semibold">
              (clientes podem aplicar no checkout)
            </span>
          </label>

          {submitError && (
            <div className="bg-nks-red-subtle border border-nks-red p-3 rounded-sm flex items-center gap-2.5 text-[11px] font-semibold text-nks-red-dark">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-10 px-4 text-xs font-bold uppercase tracking-wider"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 text-xs font-display font-extrabold uppercase tracking-wider bg-nks-red hover:bg-nks-red-dark text-white border-none shadow-nks-sm"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
