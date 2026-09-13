'use client'

import * as React from 'react'
import {
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Receipt,
  Filter,
  Loader2,
  Trophy,
  Layers,
  LineChart as LineChartIcon,
  Undo2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { formatBRL, formatDate } from '@/lib/utils/format'
import { RevenueLineChart } from '@/components/admin/charts/RevenueLineChart'
import { PaymentDistributionChart } from '@/components/admin/charts/PaymentDistributionChart'
import { PeakHoursHeatmap } from '@/components/admin/charts/PeakHoursHeatmap'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SalesData {
  selectedFilters: { month: number; year: number }
  stats: {
    totalRevenueCents: number
    totalSales: number
    avgTicketCents: number
    totalClients: number
    percentChangeFromPrevMonth: number
  }
  topArtworks: { id: string; title: string; categoryName: string; count: number; revenueCents: number }[]
  categoryDistribution: { id: string; name: string; color: string | null; count: number; revenueCents: number; percentage: number }[]
  topClients: { id: string; name: string | null; email: string; count: number; revenueCents: number }[]
  recentOrders: {
    id: string
    artworkTitle: string
    categoryName: string
    clientName: string
    amountCents: number
    paidAt: string | null
  }[]
}

type OrderRefundOverride = { status: 'PAID' | 'REFUNDED'; refundPending: boolean }

type RecentOrderRow = SalesData['recentOrders'][number] & OrderRefundOverride

interface TimelinePoint {
  date: string
  revenueCents: number
  orderCount: number
}

interface PaymentMethodStat {
  method: string
  count: number
  totalCents: number
  percentage: number
}

interface PeakHourPoint {
  dayOfWeek: number
  hour: number
  count: number
  revenueCents: number
}

interface ChartData {
  timeline: TimelinePoint[]
  paymentDistribution: PaymentMethodStat[]
  peakHours: PeakHourPoint[]
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const years = [2026, 2025, 2024]

type ChartPeriod = '7d' | '30d' | 'month-to-date'

const CHART_PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'month-to-date', label: 'Este mês' },
]

export default function AdminSalesPage() {
  const now = new Date()
  const [month, setMonth] = React.useState(now.getMonth() + 1)
  const [year, setYear] = React.useState(now.getFullYear())
  const [data, setData] = React.useState<SalesData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  const [chartPeriod, setChartPeriod] = React.useState<ChartPeriod>('30d')
  const [chartData, setChartData] = React.useState<ChartData | null>(null)
  const [chartsLoading, setChartsLoading] = React.useState(true)
  const [chartsError, setChartsError] = React.useState('')
  const [refundState, setRefundState] = React.useState<Record<string, OrderRefundOverride>>({})
  const [refundTarget, setRefundTarget] = React.useState<RecentOrderRow | null>(null)
  const [refundBusy, setRefundBusy] = React.useState(false)
  const [refundError, setRefundError] = React.useState('')

  React.useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetch(`/api/admin/sales?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((res) => {
        if (!active) return
        if (res.success) setData(res.data)
        else setError(res.error || 'Erro ao carregar vendas.')
      })
      .catch(() => active && setError('Falha na comunicação com o servidor.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [month, year])

  React.useEffect(() => {
    let active = true
    setChartsLoading(true)
    setChartsError('')
    Promise.all([
      fetch(`/api/admin/financeiro?period=${chartPeriod}`).then((r) => r.json()),
      fetch('/api/admin/financeiro?period=payment-distribution').then((r) => r.json()),
      fetch('/api/admin/financeiro?period=peak-hours').then((r) => r.json()),
    ])
      .then(([timelineRes, paymentRes, peakRes]) => {
        if (!active) return
        const failed = [timelineRes, paymentRes, peakRes].find(
          (r: { success?: boolean; error?: string }) => r && r.success === false
        )
        if (failed) {
          setChartsError(failed.error || 'Erro ao carregar gráficos.')
          setChartData(null)
          return
        }
        setChartData({
          timeline: timelineRes?.data?.timeline || [],
          paymentDistribution: paymentRes?.data?.paymentDistribution || [],
          peakHours: peakRes?.data?.peakHours || [],
        })
      })
      .catch(() => active && setChartsError('Falha na comunicação com o servidor.'))
      .finally(() => active && setChartsLoading(false))
    return () => {
      active = false
    }
  }, [chartPeriod])

  const stats = data?.stats
  const maxCategory = Math.max(...(data?.categoryDistribution.map((c) => c.count) || [1]), 1)
  const recentOrders: RecentOrderRow[] = React.useMemo(
    () =>
      (data?.recentOrders || []).map((o) => {
        const override = refundState[o.id]
        return {
          ...o,
          status: override?.status ?? 'PAID',
          refundPending: override?.refundPending ?? false,
        }
      }),
    [data?.recentOrders, refundState],
  )

  const openRefund = (order: RecentOrderRow) => {
    setRefundError('')
    setRefundTarget(order)
  }

  const submitRefund = async () => {
    if (!refundTarget) return
    setRefundBusy(true)
    setRefundError('')
    try {
      const res = await fetch(`/api/admin/orders/${refundTarget.id}/refund`, { method: 'POST' })
      const json = await res.json()
      if (json.ok && (json.status === 'refunded' || json.status === 'refund_pending')) {
        setRefundState((prev) => ({
          ...prev,
          [refundTarget.id]: {
            status: json.status === 'refunded' ? 'REFUNDED' : 'PAID',
            refundPending: json.status === 'refund_pending',
          },
        }))
        toast.success(
          json.message ||
            (json.status === 'refunded' ? 'Estorno concluído.' : 'Estorno em processamento.'),
        )
        setRefundTarget(null)
      } else {
        const msg = json.message || json.error || 'Não foi possível estornar.'
        setRefundError(msg)
        toast.error(msg, { duration: 6000 })
      }
    } catch {
      const msg = 'Falha na comunicação com o servidor.'
      setRefundError(msg)
      toast.error(msg, { duration: 6000 })
    } finally {
      setRefundBusy(false)
    }
  }
  const chartsEmpty =
    !chartsLoading &&
    (chartData?.timeline.length ?? 0) === 0 &&
    (chartData?.paymentDistribution.length ?? 0) === 0 &&
    (chartData?.peakHours.length ?? 0) === 0

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      <div>
        <h1 className="font-display text-[26px] font-extrabold uppercase tracking-tight text-nks-black mb-1.5 flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-nks-red" /> Análise de Vendas
        </h1>
        <p className="text-xs font-semibold text-nks-gray-700">
          Receita, artes e nichos mais vendidos e os clientes que mais compraram.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-nks-gray-200 rounded-sm p-5 shadow-nks-sm flex flex-col gap-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-nks-red" /> Período
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="w-full text-xs font-semibold text-nks-black bg-nks-gray-100/50 border border-nks-gray-200 rounded-sm px-3 py-2.5 focus:outline-none focus:border-nks-red transition-colors"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full text-xs font-semibold text-nks-black bg-nks-gray-100/50 border border-nks-gray-200 rounded-sm px-3 py-2.5 focus:outline-none focus:border-nks-red transition-colors"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-nks-red-subtle/30 border border-nks-red/20 text-nks-red text-xs font-semibold p-4 rounded-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-nks-red" />
        </div>
      ) : (
        <div className={`flex flex-col gap-8 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
            <div className="bg-white border border-nks-gray-200 rounded-sm p-5 shadow-nks-sm relative overflow-hidden flex flex-col justify-between min-h-[105px]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">Receita no Mês</span>
                <h3 className="font-display text-[24px] font-black tracking-tight text-nks-black mt-1">
                  {formatBRL(stats?.totalRevenueCents || 0)}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {(stats?.percentChangeFromPrevMonth ?? 0) >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-sm border border-emerald-200/50">
                    <TrendingUp className="h-3 w-3" /> +{stats?.percentChangeFromPrevMonth ?? 0}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-nks-red-subtle/50 text-nks-red px-1.5 py-0.5 rounded-sm border border-nks-red/10">
                    <TrendingDown className="h-3 w-3" /> {stats?.percentChangeFromPrevMonth ?? 0}%
                  </span>
                )}
                <span className="text-[9px] text-nks-gray-400 font-semibold">vs mês anterior</span>
              </div>
              <div className="absolute right-4 top-4 text-nks-red/10">
                <DollarSign className="h-9 w-9 stroke-[1.5]" />
              </div>
            </div>

            <StatCard title="Vendas" value={String(stats?.totalSales ?? 0)} description="Pedidos pagos" icon={<Receipt className="h-4.5 w-4.5" />} />
            <StatCard title="Ticket Médio" value={formatBRL(stats?.avgTicketCents || 0)} description="Por venda" icon={<ShoppingBag className="h-4.5 w-4.5" />} />
            <StatCard title="Clientes" value={String(stats?.totalClients ?? 0)} description="Compraram no mês" icon={<Users className="h-4.5 w-4.5" />} />
          </div>

          {/* Charts section */}
          <section className="flex flex-col gap-5" aria-labelledby="charts-heading">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h2
                  id="charts-heading"
                  className="font-display text-[18px] font-extrabold uppercase tracking-tight text-nks-black flex items-center gap-2"
                >
                  <LineChartIcon className="h-5 w-5 text-nks-red" /> Análise Financeira
                </h2>
                <p className="text-[11px] font-semibold text-nks-gray-700 mt-0.5">
                  Receita ao longo do tempo, métodos de pagamento e picos de compra.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 sm:items-end">
                <label
                  htmlFor="chart-period"
                  className="text-[10px] font-bold text-nks-gray-700 uppercase tracking-wider"
                >
                  Período dos gráficos
                </label>
                <select
                  id="chart-period"
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value as ChartPeriod)}
                  className="text-xs font-semibold text-nks-black bg-nks-gray-100/50 border border-nks-gray-200 rounded-sm px-3 py-2 focus:outline-none focus:border-nks-red transition-colors min-w-[200px]"
                >
                  {CHART_PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {chartsError && (
              <div className="bg-nks-red-subtle/30 border border-nks-red/20 text-nks-red text-xs font-semibold p-4 rounded-sm">
                {chartsError}
              </div>
            )}

            {chartsEmpty ? (
              <div className="bg-white border border-dashed border-nks-gray-200 rounded-sm p-12 flex flex-col items-center justify-center gap-2">
                <LineChartIcon className="h-10 w-10 text-nks-gray-400 stroke-[1.2]" />
                <span className="text-xs font-semibold text-nks-gray-400">
                  Nenhum dado para o período selecionado.
                </span>
              </div>
            ) : (
              <>
                {/* Line chart full width */}
                {chartsLoading ? (
                  <ChartSkeleton height={348} />
                ) : (
                  <RevenueLineChart data={chartData?.timeline || []} />
                )}

                {/* Pie + Heatmap row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {chartsLoading ? (
                    <>
                      <ChartSkeleton height={380} />
                      <ChartSkeleton height={380} />
                    </>
                  ) : (
                    <>
                      <PaymentDistributionChart data={chartData?.paymentDistribution || []} />
                      <PeakHoursHeatmap data={chartData?.peakHours || []} />
                    </>
                  )}
                </div>
              </>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Nichos mais vendidos */}
            <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                <Layers className="h-4.5 w-4.5 text-nks-red" /> Nichos mais vendidos
              </span>
              <div className="flex flex-col gap-4">
                {(data?.categoryDistribution || []).map((cat) => (
                  <div key={cat.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-nks-black">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: cat.color || 'var(--color-nks-red)' }} />
                        {cat.name}
                      </span>
                      <span className="text-[11px] font-extrabold">
                        {cat.count} <span className="text-[9px] font-bold text-nks-gray-400">({formatBRL(cat.revenueCents)})</span>
                      </span>
                    </div>
                    <div className="w-full bg-nks-gray-100 h-2 rounded-none overflow-hidden">
                      <motion.div
                        className="h-full rounded-none"
                        style={{ backgroundColor: cat.color || 'var(--color-nks-red)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((cat.count / maxCategory) * 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
                {(data?.categoryDistribution.length ?? 0) === 0 && <EmptyHint text="Nenhuma venda registrada neste período." />}
              </div>
            </div>

            {/* Top clientes */}
            <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                <Trophy className="h-4.5 w-4.5 text-nks-red" /> Clientes que mais compraram
              </span>
              <div className="flex flex-col gap-3 mt-1">
                {(data?.topClients || []).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between p-3.5 border border-nks-gray-100 rounded-sm bg-nks-gray-100/40 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-black text-nks-red shrink-0 w-5">#{i + 1}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-nks-black truncate">{c.name || c.email}</span>
                        <span className="text-[9px] text-nks-gray-400 font-semibold truncate">{c.email}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-xs font-extrabold text-nks-black">{formatBRL(c.revenueCents)}</span>
                      <span className="text-[9px] text-nks-gray-400 font-bold uppercase">{c.count} {c.count === 1 ? 'compra' : 'compras'}</span>
                    </div>
                  </div>
                ))}
                {(data?.topClients.length ?? 0) === 0 && <EmptyHint text="Nenhum cliente comprou neste período." />}
              </div>
            </div>
          </div>

          {/* Top artes */}
          <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-nks-red" /> Artes mais vendidas
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              {(data?.topArtworks || []).map((art, i) => (
                <div key={art.id} className="flex items-center justify-between p-3.5 border border-nks-gray-100 rounded-sm bg-nks-gray-100/40 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-black text-nks-red shrink-0 w-5">#{i + 1}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-nks-black truncate">{art.title}</span>
                      <span className="text-[9px] text-nks-gray-400 font-semibold uppercase tracking-wider">{art.categoryName}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xs font-extrabold text-nks-black">{art.count} {art.count === 1 ? 'venda' : 'vendas'}</span>
                    <span className="text-[9px] text-nks-gray-400 font-bold">{formatBRL(art.revenueCents)}</span>
                  </div>
                </div>
              ))}
              {(data?.topArtworks.length ?? 0) === 0 && <EmptyHint text="Nenhuma arte vendida neste período." />}
            </div>
          </div>

          {/* Pedidos recentes */}
          <div className="bg-white border border-nks-gray-200 rounded-sm shadow-nks-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-nks-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                <Receipt className="h-4.5 w-4.5 text-nks-red" /> Pedidos pagos recentes
              </span>
            </div>
            <DataTable
              headerVariant="muted"
              rows={recentOrders}
              getRowKey={(o) => o.id}
              emptyTitle="Nenhum pedido pago neste período."
              emptyIcon={Receipt}
              columns={[
                {
                  id: 'art',
                  header: 'Arte',
                  cellClassName: 'font-semibold text-nks-black',
                  render: (o) => o.artworkTitle,
                },
                {
                  id: 'niche',
                  header: 'Nicho',
                  hideOnMobile: true,
                  cellClassName: 'text-xs text-nks-gray-700',
                  render: (o) => o.categoryName,
                },
                {
                  id: 'client',
                  header: 'Cliente',
                  cellClassName: 'text-xs text-nks-gray-700',
                  render: (o) => o.clientName,
                },
                {
                  id: 'amount',
                  header: 'Valor',
                  cellClassName: 'font-bold text-nks-black',
                  render: (o) => formatBRL(o.amountCents),
                },
                {
                  id: 'status',
                  header: 'Status',
                  render: (o) => <OrderStatusBadge order={o} />,
                },
                {
                  id: 'date',
                  header: 'Data',
                  hideOnMobile: true,
                  cellClassName: 'text-xs text-nks-gray-400 whitespace-nowrap',
                  render: (o) => (o.paidAt ? formatDate(o.paidAt) : '—'),
                },
                {
                  id: 'actions',
                  header: 'Ação',
                  align: 'right',
                  render: (o) =>
                    o.status === 'PAID' && !o.refundPending ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRefund(o)}
                        aria-label={`Estornar pedido de ${o.artworkTitle}`}
                        className="h-8 px-2.5 gap-1 text-[10px] font-bold border border-nks-red/20 text-nks-red hover:bg-nks-red-subtle"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Estornar
                      </Button>
                    ) : null,
                },
              ]}
            />
          </div>
        </div>
      )}

      <Dialog
        open={!!refundTarget}
        onOpenChange={(open) => {
          if (!open && !refundBusy) {
            setRefundTarget(null)
            setRefundError('')
          }
        }}
      >
        <DialogClose
          onClick={() => {
            if (!refundBusy) {
              setRefundTarget(null)
              setRefundError('')
            }
          }}
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar estorno</DialogTitle>
            <DialogDescription>
              O cliente perde o download imediatamente. Pix pode demorar e ficar como estorno em processamento.
            </DialogDescription>
          </DialogHeader>
          {refundTarget && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs border border-nks-gray-200 bg-nks-gray-100/40 rounded-sm p-4">
              <dt className="font-bold uppercase tracking-wider text-nks-gray-400">Arte</dt>
              <dd className="font-semibold text-nks-black text-right">{refundTarget.artworkTitle}</dd>
              <dt className="font-bold uppercase tracking-wider text-nks-gray-400">Cliente</dt>
              <dd className="font-semibold text-nks-black text-right">{refundTarget.clientName}</dd>
              <dt className="font-bold uppercase tracking-wider text-nks-gray-400">Pagamento</dt>
              <dd className="font-extrabold text-nks-black text-right">{formatBRL(refundTarget.amountCents)}</dd>
            </dl>
          )}
          {refundError && (
            <p className="text-xs font-semibold text-nks-red bg-nks-red-subtle/50 border border-nks-red/20 rounded-sm px-3 py-2">
              {refundError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={refundBusy}
              onClick={() => {
                setRefundTarget(null)
                setRefundError('')
              }}
              className="h-10"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={refundBusy}
              onClick={submitRefund}
              aria-label="Confirmar estorno do pedido"
              className="h-10 gap-1.5"
            >
              {refundBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Estornar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OrderStatusBadge({ order }: { order: RecentOrderRow }) {
  if (order.status === 'REFUNDED') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border border-nks-gray-200 bg-nks-gray-100 text-nks-gray-700 font-display tracking-wider">
        Estornado
      </span>
    )
  }
  if (order.refundPending) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border border-amber-200 bg-amber-50 text-amber-700 font-display tracking-wider">
        Estorno em processamento
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm border border-green-200 bg-green-50 text-green-700 font-display tracking-wider">
      Pago
    </span>
  )
}

function StatCard({ title, value, description, icon }: { title: string; value: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-nks-gray-200 rounded-sm p-5 shadow-nks-sm relative overflow-hidden flex flex-col justify-between min-h-[105px]">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">{title}</span>
        <h3 className="font-display text-[24px] font-black tracking-tight text-nks-black mt-1">{value}</h3>
      </div>
      <span className="text-[9px] text-nks-gray-400 font-semibold mt-2">{description}</span>
      <div className="absolute right-4 top-4 text-nks-red/10">{icon}</div>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-center text-xs text-nks-gray-400 py-10 border border-dashed border-nks-gray-200 rounded-sm bg-nks-gray-100/10 col-span-full">
      {text}
    </div>
  )
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4 animate-pulse"
      style={{ minHeight: height }}
    >
      <div className="h-3 w-32 bg-nks-gray-100 rounded-sm" />
      <div className="flex-1 bg-nks-gray-100/60 rounded-sm" />
    </div>
  )
}
