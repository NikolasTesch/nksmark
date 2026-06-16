'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  Loader2,
  Tag,
  X,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCart } from '@/hooks/useCart'
import { formatBRL } from '@/lib/utils/format'
import type { CartItemWithArtwork } from '@/types/cart'

/**
 * Página /carrinho — lista itens do carrinho do cliente logado, permite
 * remover itens, aplicar cupom de desconto e finalizar compra (que dispara
 * POST /api/orders e redireciona para o Mercado Pago).
 *
 * Restrição: só CLIENT pode comprar. Visitante e equipe interna recebem
 * uma tela de orientação em vez do carrinho.
 */
export default function CartPage() {
  const { data: session, status } = useSession()
  const { cart, loading, removeFromCart, clearCart } = useCart()

  const [couponCode, setCouponCode] = React.useState('')
  const [appliedCoupon, setAppliedCoupon] = React.useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = React.useState(false)
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null)
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [couponFeedback, setCouponFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null)

  /** Aplica o cupom (validação leve no cliente — a regra real vive no /api/orders). */
  const handleApplyCoupon = () => {
    const trimmed = couponCode.trim().toUpperCase()
    if (!trimmed) {
      setCouponFeedback({ type: 'error', message: 'Informe um código de cupom.' })
      return
    }
    setAppliedCoupon(trimmed)
    setCouponFeedback({ type: 'success', message: `Cupom "${trimmed}" será aplicado no checkout.` })
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponFeedback(null)
  }

  const handleRemoveItem = async (itemId: string) => {
    setRemovingId(itemId)
    await removeFromCart(itemId)
    setRemovingId(null)
  }

  /**
   * Finaliza compra: chama /api/orders com todos os IDs do carrinho + cupom.
   * Em sucesso, redireciona para a página de pagamento do Mercado Pago.
   */
  const handleCheckout = async () => {
    if (!cart?.items?.length) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const artworkIds = cart.items.map((i) => i.artworkId)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkIds, couponCode: appliedCoupon ?? undefined }),
      })
      const result = await res.json()
      if (result.success && result.data?.initPoint) {
        await clearCart()
        window.location.href = result.data.initPoint
        return
      }
      setCheckoutError(result.error || 'Não foi possível iniciar o pagamento.')
    } catch {
      setCheckoutError('Falha na comunicação com o servidor.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  // ----------- Estados de borda (auth / role) -----------

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-nks-gray-400" />
      </div>
    )
  }

  const userRole = (session?.user as { role?: string })?.role

  // Visitante: precisa logar antes de ver o carrinho.
  if (!session?.user) {
    return (
      <AuthGate
        title="Entre para ver seu carrinho"
        description="Faça login como cliente para acessar suas artes selecionadas e finalizar a compra."
        ctaHref="/login?callbackUrl=/carrinho"
        ctaLabel="Entrar na conta"
      />
    )
  }

  // Equipe interna não usa carrinho.
  if (userRole !== 'CLIENT') {
    return (
      <AuthGate
        title="Carrinho disponível para clientes"
        description="Sua conta interna tem acesso direto aos downloads, sem necessidade de carrinho."
        ctaHref={userRole === 'ADMIN' ? '/admin' : '/meus-downloads'}
        ctaLabel={userRole === 'ADMIN' ? 'Ir para o painel' : 'Ir para Meus Downloads'}
        icon={<ShieldCheck className="h-6 w-6" />}
      />
    )
  }

  // ----------- Render principal -----------

  const items: CartItemWithArtwork[] = cart?.items ?? []
  const subtotalCents = items.reduce((sum, i) => sum + i.artwork.priceCents, 0)
  const itemCount = items.length

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      {/* Cabeçalho editorial */}
      <div className="flex flex-col gap-2">
        <span className="nks-eyebrow">Sacola de Compras</span>
        <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-2xl md:text-3xl text-nks-black">
          Seu carrinho
        </h1>
        <p className="text-sm text-nks-gray-700">
          Revise as artes selecionadas antes de finalizar a compra. Pagamento seguro via Mercado Pago.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lista de itens */}
          <section className="lg:col-span-8 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-nks-gray-700 uppercase tracking-wider">
                {itemCount} {itemCount === 1 ? 'arte' : 'artes'} no carrinho
              </h2>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-nks-gray-400 hover:text-nks-red transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpar carrinho
              </button>
            </div>

            <ul className="flex flex-col gap-2.5">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  isRemoving={removingId === item.id}
                  onRemove={() => handleRemoveItem(item.id)}
                />
              ))}
            </ul>
          </section>

          {/* Resumo + cupom + checkout */}
          <aside className="lg:col-span-4 flex flex-col gap-4 h-fit lg:sticky lg:top-20">
            <CouponPanel
              couponCode={couponCode}
              onChange={setCouponCode}
              onApply={handleApplyCoupon}
              onRemove={handleRemoveCoupon}
              appliedCoupon={appliedCoupon}
              feedback={couponFeedback}
            />

            <SummaryPanel
              subtotalCents={subtotalCents}
              itemCount={itemCount}
              loading={checkoutLoading}
              error={checkoutError}
              onCheckout={handleCheckout}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

// ====================================================================
// Sub-componentes
// ====================================================================

function CartItemRow({
  item,
  isRemoving,
  onRemove,
}: {
  item: CartItemWithArtwork
  isRemoving: boolean
  onRemove: () => void
}) {
  const { artwork } = item
  return (
    <li className="group flex gap-3 p-3 border border-nks-gray-200 bg-white rounded-lg shadow-nks-sm hover:shadow-nks transition-shadow">
      <Link
        href={`/loja/${artwork.slug}`}
        className="relative shrink-0 h-20 w-20 sm:h-24 sm:w-24 bg-nks-gray-100 rounded overflow-hidden"
      >
        {artwork.previewUrl ? (
          <Image
            src={artwork.previewUrl}
            alt={artwork.title}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-nks-gray-400 opacity-60" />
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-grow min-w-0 gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/loja/${artwork.slug}`}
            className="text-[14px] font-bold text-nks-black leading-snug line-clamp-2 hover:text-nks-red transition-colors"
          >
            {artwork.title}
          </Link>
          <span className="text-sm font-extrabold text-nks-black whitespace-nowrap shrink-0">
            {formatBRL(artwork.priceCents)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <span className="text-[11px] text-nks-gray-400 font-semibold">
            Arte digital · Download imediato
          </span>
          <button
            type="button"
            onClick={onRemove}
            disabled={isRemoving}
            aria-label={`Remover ${artwork.title} do carrinho`}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-nks-gray-400 hover:text-nks-red transition-colors disabled:opacity-50"
          >
            {isRemoving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {isRemoving ? 'Removendo...' : 'Remover'}
          </button>
        </div>
      </div>
    </li>
  )
}

function CouponPanel({
  couponCode,
  onChange,
  onApply,
  onRemove,
  appliedCoupon,
  feedback,
}: {
  couponCode: string
  onChange: (v: string) => void
  onApply: () => void
  onRemove: () => void
  appliedCoupon: string | null
  feedback: { type: 'success' | 'error'; message: string } | null
}) {
  return (
    <div className="flex flex-col gap-2 p-4 border border-nks-gray-200 bg-white rounded-lg">
      <span className="text-[11px] font-bold text-nks-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5" /> Cupom de desconto
      </span>

      {appliedCoupon ? (
        <div className="flex items-center justify-between gap-2 p-2.5 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {appliedCoupon} aplicado
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover cupom"
            className="text-green-700 hover:text-green-900 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-stretch gap-2">
          <Input
            value={couponCode}
            onChange={(e) => onChange(e.target.value)}
            placeholder="CÓDIGO"
            className="font-mono uppercase tracking-wider text-[13px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onApply()
              }
            }}
          />
          <Button
            type="button"
            onClick={onApply}
            variant="secondary"
            size="default"
            className="shrink-0 px-3"
          >
            Aplicar
          </Button>
        </div>
      )}

      {feedback && (
        <p
          className={`text-[11px] font-semibold leading-normal flex items-center gap-1 mt-1 ${
            feedback.type === 'success' ? 'text-green-700' : 'text-nks-red'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" />
          ) : (
            <AlertTriangle className="h-3 w-3 shrink-0" />
          )}
          {feedback.message}
        </p>
      )}
    </div>
  )
}

function SummaryPanel({
  subtotalCents,
  itemCount,
  loading,
  error,
  onCheckout,
}: {
  subtotalCents: number
  itemCount: number
  loading: boolean
  error: string | null
  onCheckout: () => void
}) {
  // Sem preview de cupom: o desconto é aplicado de verdade no servidor em
  // /api/orders. Aqui mostramos o subtotal como total indicativo.
  const totalCents = subtotalCents
  return (
    <div className="flex flex-col gap-3 p-5 border border-nks-gray-200 bg-nks-gray-100 rounded-lg">
      <span className="text-[11px] font-bold text-nks-gray-400 uppercase tracking-wider">
        Resumo do pedido
      </span>

      <div className="flex flex-col gap-2 text-[13px]">
        <div className="flex items-center justify-between text-nks-gray-700">
          <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'itens'})</span>
          <span className="font-semibold text-nks-black">{formatBRL(subtotalCents)}</span>
        </div>
        <div className="flex items-center justify-between text-nks-gray-400 text-[12px]">
          <span>Desconto</span>
          <span>— aplicado no checkout</span>
        </div>
        <div className="border-t border-nks-gray-200 my-1" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-nks-black uppercase tracking-wider">Total</span>
          <span className="text-xl font-extrabold text-nks-black">{formatBRL(totalCents)}</span>
        </div>
      </div>

      <Button
        onClick={onCheckout}
        disabled={loading || itemCount === 0}
        size="lg"
        className="w-full gap-2 font-bold mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Redirecionando ao pagamento...
          </>
        ) : (
          <>
            Finalizar compra <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      {error && (
        <p className="text-[11px] text-nks-red font-semibold leading-normal flex items-center gap-1 text-center justify-center">
          <AlertTriangle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-nks-gray-400 font-semibold justify-center mt-1">
        <ShieldCheck className="h-3 w-3" /> Pagamento seguro · Mercado Pago
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-nks-gray-200 bg-nks-gray-100 rounded-lg max-w-lg mx-auto my-8">
      <div className="flex h-12 w-12 items-center justify-center rounded bg-nks-black text-white mb-4">
        <ShoppingCart className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-lg text-nks-black mb-1.5">Seu carrinho está vazio</h3>
      <p className="text-sm text-nks-gray-700 mb-6 max-w-xs leading-normal">
        Explore o catálogo e adicione artes à sua sacola para finalizar a compra em poucos cliques.
      </p>
      <Link href="/loja">
        <Button className="gap-2 px-5 h-9">
          Explorar catálogo <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}

function AuthGate({
  title,
  description,
  ctaHref,
  ctaLabel,
  icon,
}: {
  title: string
  description: string
  ctaHref: string
  ctaLabel: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-nks-gray-200 bg-nks-gray-100 rounded-lg max-w-lg mx-auto my-8">
      <div className="flex h-12 w-12 items-center justify-center rounded bg-nks-black text-white mb-4">
        {icon ?? <Lock className="h-6 w-6" />}
      </div>
      <h3 className="font-semibold text-lg text-nks-black mb-1.5">{title}</h3>
      <p className="text-sm text-nks-gray-700 mb-6 max-w-xs leading-normal">{description}</p>
      <Link href={ctaHref}>
        <Button className="gap-2 px-5 h-9">
          {ctaLabel} <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}
