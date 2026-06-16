'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag,
  Plus,
  Loader2,
  AlertCircle,
  Power,
  PowerOff,
  Pencil,
  Trash2,
  Check,
  X,
  Ticket,
  Calendar,
  Percent,
  Hash,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBRL, formatDate } from '@/lib/utils/format'
import { useAdminCoupons, Coupon } from '@/hooks/useAdminCoupons'
import { CouponFormDialog } from './CouponFormDialog'

type DialogMode = null | 'create' | 'edit'

type Status = 'ativo' | 'expirado' | 'inativo'

interface CouponView {
  coupon: Coupon
  status: Status
  isExhausted: boolean
}

function deriveStatus(coupon: Coupon): { status: Status; isExhausted: boolean } {
  if (!coupon.isActive) return { status: 'inativo', isExhausted: false }
  if (coupon.expiresAt) {
    const expiry = new Date(coupon.expiresAt)
    if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
      return { status: 'expirado', isExhausted: false }
    }
  }
  const isExhausted =
    coupon.maxUses != null && coupon.usedCount >= coupon.maxUses
  return { status: 'ativo', isExhausted }
}

function formatValue(coupon: Coupon): string {
  if (coupon.discountType === 'PERCENTAGE') {
    return `${coupon.discountValue}%`
  }
  return formatBRL(coupon.discountValue)
}

function StatusBadge({ status, isExhausted }: { status: Status; isExhausted: boolean }) {
  if (isExhausted && status === 'ativo') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border border-amber-200 bg-amber-50 text-amber-700 font-display tracking-wider">
        <ShieldAlert className="h-2.5 w-2.5" />
        Esgotado
      </span>
    )
  }
  if (status === 'ativo') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border border-green-200 bg-green-50 text-green-700 font-display tracking-wider">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Ativo
      </span>
    )
  }
  if (status === 'expirado') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border border-amber-200 bg-amber-50 text-amber-700 font-display tracking-wider">
        <Calendar className="h-2.5 w-2.5" />
        Expirado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border border-nks-gray-200 bg-nks-gray-100 text-nks-gray-700 font-display tracking-wider">
      <PowerOff className="h-2.5 w-2.5" />
      Inativo
    </span>
  )
}

function ConfirmDeleteRow({
  coupon,
  busy,
  onConfirm,
  onCancel,
}: {
  coupon: Coupon
  busy: boolean
  onConfirm: (force: boolean) => void
  onCancel: () => void
}) {
  const needsForce = coupon.usedCount > 0
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-nks-red uppercase tracking-wider">
          Excluir?
        </span>
        <Button
          onClick={() => onConfirm(false)}
          disabled={busy}
          size="sm"
          className="h-7 px-2.5 gap-1 text-[10px] font-black bg-nks-red hover:bg-nks-red-dark text-white rounded-sm border-none"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {needsForce ? 'Forçar' : 'Sim'}
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 border border-nks-gray-200 rounded-sm text-[10px] font-bold"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      {needsForce && (
        <span className="text-[9px] text-nks-gray-400 font-semibold uppercase tracking-wider text-right max-w-[180px]">
          Já usado {coupon.usedCount}× — exclusão forçada
        </span>
      )}
    </div>
  )
}

export default function AdminCouponsPage() {
  const {
    coupons,
    loading,
    error,
    refresh,
    createCoupon,
    updateCoupon,
    toggleActive,
    deleteCoupon,
  } = useAdminCoupons()

  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null)
  const [editingCoupon, setEditingCoupon] = React.useState<Coupon | null>(null)
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<
    { kind: 'success' | 'error'; message: string } | null
  >(null)

  // Auto-dismiss toast
  React.useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const views: CouponView[] = React.useMemo(
    () =>
      coupons.map((c) => {
        const { status, isExhausted } = deriveStatus(c)
        return { coupon: c, status, isExhausted }
      }),
    [coupons],
  )

  const counts = React.useMemo(() => {
    let ativo = 0
    let expirado = 0
    let inativo = 0
    let esgotado = 0
    for (const v of views) {
      if (v.status === 'ativo') ativo += 1
      else if (v.status === 'expirado') expirado += 1
      else inativo += 1
      if (v.isExhausted) esgotado += 1
    }
    return { total: views.length, ativo, expirado, inativo, esgotado }
  }, [views])

  const openCreate = () => {
    setEditingCoupon(null)
    setDialogMode('create')
  }

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setDialogMode('edit')
  }

  const closeDialog = () => {
    setDialogMode(null)
    setEditingCoupon(null)
  }

  const handleToggleActive = async (coupon: Coupon) => {
    setActionLoadingId(coupon.id)
    const res = await toggleActive(coupon)
    setActionLoadingId(null)
    if (res.success) {
      setToast({
        kind: 'success',
        message: coupon.isActive
          ? `Cupom ${coupon.code} desativado.`
          : `Cupom ${coupon.code} ativado.`,
      })
    } else {
      setToast({ kind: 'error', message: res.error || 'Erro ao alterar status.' })
    }
  }

  const handleDelete = async (id: string, force: boolean) => {
    setActionLoadingId(id)
    const res = await deleteCoupon(id, force)
    setActionLoadingId(null)
    setPendingDeleteId(null)
    if (res.success) {
      setToast({ kind: 'success', message: 'Cupom excluído.' })
    } else {
      setToast({ kind: 'error', message: res.error || 'Erro ao excluir cupom.' })
    }
  }

  const handleFormCreate = async (payload: Parameters<typeof createCoupon>[0]) => {
    const res = await createCoupon(payload)
    if (res.success) {
      setToast({ kind: 'success', message: `Cupom ${res.data.code} criado.` })
    }
    return { success: res.success, error: 'error' in res ? res.error : undefined }
  }

  const handleFormEdit = async (
    id: string,
    payload: Parameters<typeof updateCoupon>[1],
  ) => {
    const res = await updateCoupon(id, payload)
    if (res.success) {
      setToast({ kind: 'success', message: `Cupom ${res.data.code} atualizado.` })
    }
    return { success: res.success, error: 'error' in res ? res.error : undefined }
  }

  return (
    <div className="flex flex-col gap-6 py-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-black uppercase tracking-tight text-nks-black mb-1 flex items-center gap-2.5">
            <Tag className="h-7 w-7 text-nks-red" /> Cupons de Desconto
          </h1>
          <p className="text-xs font-semibold text-nks-gray-400">
            Crie, edite e controle os cupons de desconto aplicados no checkout.
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="h-11 px-5 text-xs font-display font-extrabold uppercase tracking-wider bg-nks-red hover:bg-nks-red-dark text-white border-none shadow-nks-sm gap-2"
        >
          <Plus className="h-4 w-4" /> Novo cupom
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini label="Total" value={counts.total} icon={<Ticket className="h-4 w-4" />} />
        <StatMini
          label="Ativos"
          value={counts.ativo}
          tone="green"
          icon={<Power className="h-4 w-4" />}
        />
        <StatMini
          label="Expirados"
          value={counts.expirado}
          tone="amber"
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatMini
          label="Inativos"
          value={counts.inativo}
          tone="muted"
          icon={<PowerOff className="h-4 w-4" />}
        />
      </div>

      {/* Top-level error banner */}
      {error && (
        <div className="bg-nks-red-subtle border border-nks-red/20 p-4 rounded-sm flex items-center gap-3 text-xs font-semibold text-nks-red-dark">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              onClick={refresh}
              className="underline hover:text-nks-red cursor-pointer uppercase tracking-wider font-extrabold text-[10px]"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-nks-gray-200 rounded-sm shadow-nks-sm overflow-hidden">
        {loading && coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
            <span className="text-xs text-nks-gray-400 font-semibold uppercase tracking-wider">
              Carregando cupons...
            </span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="h-12 w-12 rounded-full bg-nks-gray-100 flex items-center justify-center text-nks-gray-400">
              <Tag className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-nks-black">Nenhum cupom cadastrado</span>
              <span className="text-xs text-nks-gray-400 font-semibold max-w-[280px]">
                Clique em <strong>Novo cupom</strong> para criar o primeiro cupom de desconto.
              </span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-white border-b border-nks-gray-200/80 font-display font-extrabold text-[10px] uppercase tracking-[0.12em] text-nks-gray-400 select-none">
                  <th className="py-4 px-4 sm:px-5 font-bold">Código</th>
                  <th className="py-4 px-4 font-bold">Tipo</th>
                  <th className="py-4 px-4 font-bold">Valor</th>
                  <th className="py-4 px-4 font-bold text-center">Usos</th>
                  <th className="py-4 px-4 font-bold">Expiração</th>
                  <th className="py-4 px-4 font-bold">Status</th>
                  <th className="py-4 px-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nks-gray-100">
                {views.map(({ coupon, status, isExhausted }, index) => {
                  const busy = actionLoadingId === coupon.id
                  const showDeleteConfirm = pendingDeleteId === coupon.id
                  const exhaustedAndActive = isExhausted && status === 'ativo'
                  return (
                    <motion.tr
                      key={coupon.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.4) }}
                      className="hover:bg-nks-gray-100/30 transition-colors"
                    >
                      {/* Código */}
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-black text-nks-black bg-nks-gray-100 border border-nks-gray-200 px-2 py-1 rounded-sm select-all">
                            {coupon.code}
                          </span>
                          {coupon.description && (
                            <span className="text-[10px] text-nks-gray-400 font-semibold truncate max-w-[180px] hidden md:inline">
                              {coupon.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border font-display tracking-wider ${
                            coupon.discountType === 'PERCENTAGE'
                              ? 'bg-nks-red-subtle text-nks-red border-nks-red/20'
                              : 'bg-nks-black text-white border-nks-black'
                          }`}
                        >
                          {coupon.discountType === 'PERCENTAGE' ? (
                            <Percent className="h-2.5 w-2.5" />
                          ) : (
                            <Hash className="h-2.5 w-2.5" />
                          )}
                          {coupon.discountType === 'PERCENTAGE' ? 'Percentagem' : 'Fixo'}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 text-xs font-extrabold text-nks-black whitespace-nowrap">
                        {formatValue(coupon)}
                      </td>

                      {/* Usos */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            exhaustedAndActive
                              ? 'text-amber-700'
                              : 'text-nks-black'
                          }`}
                        >
                          {coupon.usedCount}
                          <span className="text-nks-gray-400">/</span>
                          <span className="text-nks-gray-400">
                            {coupon.maxUses ?? '∞'}
                          </span>
                        </span>
                      </td>

                      {/* Expiração */}
                      <td className="py-3.5 px-4 text-xs text-nks-gray-700 font-semibold whitespace-nowrap">
                        {coupon.expiresAt ? (
                          formatDate(coupon.expiresAt)
                        ) : (
                          <span className="text-nks-gray-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={status} isExhausted={isExhausted} />
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4">
                        {showDeleteConfirm ? (
                          <ConfirmDeleteRow
                            coupon={coupon}
                            busy={busy}
                            onConfirm={(force) => handleDelete(coupon.id, force)}
                            onCancel={() => setPendingDeleteId(null)}
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleToggleActive(coupon)}
                              disabled={busy}
                              variant="ghost"
                              size="icon"
                              title={coupon.isActive ? 'Desativar cupom' : 'Ativar cupom'}
                              className={`h-8 w-8 rounded-sm border ${
                                coupon.isActive
                                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300'
                                  : 'border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300'
                              }`}
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : coupon.isActive ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              onClick={() => openEdit(coupon)}
                              disabled={busy}
                              variant="ghost"
                              size="icon"
                              title="Editar cupom"
                              className="h-8 w-8 rounded-sm border border-nks-gray-200 text-nks-black hover:bg-nks-gray-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              onClick={() => setPendingDeleteId(coupon.id)}
                              disabled={busy}
                              variant="ghost"
                              size="icon"
                              title="Excluir cupom"
                              className="h-8 w-8 rounded-sm border border-nks-red/20 text-nks-red hover:bg-nks-red-subtle hover:border-nks-red"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form dialog (create + edit) */}
      <CouponFormDialog
        open={dialogMode !== null}
        onOpenChange={(o) => {
          if (!o) closeDialog()
        }}
        mode={dialogMode === 'edit' ? 'edit' : 'create'}
        initialCoupon={editingCoupon}
        onSubmitCreate={handleFormCreate}
        onSubmitEdit={handleFormEdit}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-[60] max-w-[360px]"
            role="status"
          >
            <div
              className={`flex items-center gap-3 p-3.5 pr-4 rounded-sm border shadow-nks-lg bg-white ${
                toast.kind === 'success'
                  ? 'border-green-200'
                  : 'border-nks-red/30'
              }`}
            >
              <div
                className={`h-8 w-8 shrink-0 rounded-sm flex items-center justify-center ${
                  toast.kind === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-nks-red-subtle text-nks-red'
                }`}
              >
                {toast.kind === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-nks-gray-400">
                  {toast.kind === 'success' ? 'Sucesso' : 'Erro'}
                </span>
                <span className="text-xs font-bold text-nks-black leading-snug">
                  {toast.message}
                </span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-nks-gray-400 hover:text-nks-black transition-colors p-1 ml-1"
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatMini({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone?: 'default' | 'green' | 'amber' | 'muted'
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: 'text-nks-black',
    green: 'text-green-700',
    amber: 'text-amber-700',
    muted: 'text-nks-gray-700',
  }
  return (
    <div className="bg-white border border-nks-gray-200 rounded-sm p-3.5 shadow-nks-sm flex items-center gap-3">
      <div
        className={`h-9 w-9 rounded-sm flex items-center justify-center bg-nks-gray-100 ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-nks-gray-400">
          {label}
        </span>
        <span className={`text-xl font-black ${toneClasses[tone]}`}>{value}</span>
      </div>
    </div>
  )
}
