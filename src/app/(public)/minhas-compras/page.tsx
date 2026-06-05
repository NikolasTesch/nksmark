'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, ArrowRight, Loader2, AlertTriangle, RefreshCw, Download, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBRL, formatDate } from '@/lib/utils/format'

interface OrderItem {
  id: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED'
  amountCents: number
  createdAt: string
  paidAt: string | null
  artwork: { id: string; title: string; slug: string; previewUrl: string }
}

const statusLabel: Record<OrderItem['status'], { text: string; className: string }> = {
  PAID: { text: 'Pago', className: 'bg-green-50 text-green-700 border-green-200' },
  PENDING: { text: 'Aguardando pagamento', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  FAILED: { text: 'Falhou', className: 'bg-nks-red-subtle text-nks-red border-nks-red/20' },
  EXPIRED: { text: 'Expirado', className: 'bg-nks-gray-100 text-nks-gray-700 border-nks-gray-200' },
  REFUNDED: { text: 'Estornado', className: 'bg-nks-gray-100 text-nks-gray-700 border-nks-gray-200' },
}

export default function MinhasComprasPage() {
  const [orders, setOrders] = React.useState<OrderItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)

  const fetchOrders = React.useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/orders')
      const result = await res.json()
      if (result.success) setOrders(result.data)
      else setError(result.error || 'Erro ao carregar compras.')
    } catch {
      setError('Falha na comunicação com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Baixa a arte comprada. Para artes com 1 arquivo usa URL assinada; com vários, o .zip.
  const handleDownload = async (order: OrderItem) => {
    setDownloadingId(order.id)
    try {
      // Busca os arquivos da arte (catálogo público devolve só formatos/ids).
      const artRes = await fetch(`/api/artworks?slug=${order.artwork.slug}`)
      const artJson = await artRes.json()
      const art = artJson.success ? artJson.data[0] : null
      const files: { id: string; format: string }[] = art?.files || []

      if (files.length > 1) {
        const res = await fetch('/api/downloads/zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artworkId: order.artwork.id }),
        })
        if (!res.ok) throw new Error('zip')
        const blob = await res.blob()
        triggerBlobDownload(blob, `${slugify(order.artwork.title)}.zip`)
      } else if (files.length === 1) {
        const res = await fetch('/api/downloads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artworkId: order.artwork.id, fileId: files[0].id }),
        })
        const result = await res.json()
        if (result.success && result.data?.downloadUrl) {
          triggerUrlDownload(result.data.downloadUrl)
        } else {
          throw new Error(result.error || 'download')
        }
      }
    } catch {
      setError('Não foi possível iniciar o download. Tente novamente.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-nks-gray-400" />
      </div>
    )
  }

  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 border border-nks-gray-200 bg-nks-gray-100 rounded max-w-lg mx-auto my-8">
        <div className="flex h-12 w-12 items-center justify-center rounded bg-nks-red text-white mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-lg text-nks-black mb-1.5">Erro ao carregar compras</h3>
        <p className="text-sm text-nks-gray-700 mb-6 max-w-xs leading-normal">{error}</p>
        <Button onClick={fetchOrders} variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      <div>
        <span className="nks-eyebrow">Histórico da Conta</span>
        <h1 className="font-display font-extrabold uppercase tracking-[-0.03em] leading-[1.02] text-2xl md:text-3xl text-nks-black mt-2 mb-2">
          Minhas Compras
        </h1>
        <p className="text-sm text-nks-gray-700">
          Suas artes adquiridas. O download fica disponível permanentemente nesta página.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 border border-nks-gray-200 bg-nks-gray-100 rounded max-w-lg mx-auto my-8">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-nks-black text-white mb-4">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg text-nks-black mb-1.5">Nenhuma compra ainda</h3>
          <p className="text-sm text-nks-gray-700 mb-6 max-w-xs leading-normal">
            Explore o catálogo e adquira artes para download imediato.
          </p>
          <Link href="/loja">
            <Button className="gap-1 px-5 h-9">
              Ir para a loja <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            const badge = statusLabel[order.status]
            const isPaid = order.status === 'PAID'
            return (
              <div key={order.id} className="border border-nks-gray-200 rounded-lg overflow-hidden bg-white shadow-nks-sm flex flex-col">
                <div className="relative h-36 w-full bg-nks-gray-100">
                  <Image src={order.artwork.previewUrl || '/placeholder.jpg'} alt={order.artwork.title} fill className="object-cover" />
                </div>
                <div className="flex flex-col gap-2 p-4 flex-grow">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-nks-black leading-snug line-clamp-2">{order.artwork.title}</h3>
                    <span className="text-sm font-extrabold text-nks-black whitespace-nowrap">{formatBRL(order.amountCents)}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 self-start text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${badge.className}`}>
                    {isPaid ? null : order.status === 'PENDING' ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {badge.text}
                  </span>
                  <span className="text-[11px] text-nks-gray-400 font-semibold">
                    {isPaid && order.paidAt ? `Pago em ${formatDate(order.paidAt)}` : `Criado em ${formatDate(order.createdAt)}`}
                  </span>

                  <div className="mt-auto pt-3">
                    {isPaid ? (
                      <Button
                        onClick={() => handleDownload(order)}
                        disabled={downloadingId === order.id}
                        size="sm"
                        className="w-full gap-1.5"
                      >
                        {downloadingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {downloadingId === order.id ? 'Preparando...' : 'Baixar'}
                      </Button>
                    ) : order.status === 'PENDING' ? (
                      <Link href={`/loja/${order.artwork.slug}`} className="block">
                        <Button size="sm" variant="secondary" className="w-full gap-1.5">
                          Concluir compra
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/loja/${order.artwork.slug}`} className="block">
                        <Button size="sm" variant="outline" className="w-full gap-1.5">
                          Ver arte
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-')
}

function triggerUrlDownload(url: string) {
  const a = document.createElement('a')
  a.href = url
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
