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
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatBRL, formatDate } from '@/lib/utils/format'

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
  recentOrders: { id: string; artworkTitle: string; categoryName: string; clientName: string; amountCents: number; paidAt: string | null }[]
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const years = [2026, 2025, 2024]

export default function AdminSalesPage() {
  const now = new Date()
  const [month, setMonth] = React.useState(now.getMonth() + 1)
  const [year, setYear] = React.useState(now.getFullYear())
  const [data, setData] = React.useState<SalesData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

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

  const stats = data?.stats
  const maxCategory = Math.max(...(data?.categoryDistribution.map((c) => c.count) || [1]), 1)

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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-nks-gray-100 text-nks-gray-700 border-b border-nks-gray-200 font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Arte</th>
                    <th className="py-3 px-4">Nicho</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4 whitespace-nowrap">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nks-gray-200">
                  {(data?.recentOrders || []).map((o) => (
                    <tr key={o.id} className="hover:bg-nks-gray-100/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-nks-black">{o.artworkTitle}</td>
                      <td className="py-3 px-4 text-xs text-nks-gray-700">{o.categoryName}</td>
                      <td className="py-3 px-4 text-xs text-nks-gray-700">{o.clientName}</td>
                      <td className="py-3 px-4 font-bold text-nks-black">{formatBRL(o.amountCents)}</td>
                      <td className="py-3 px-4 text-xs text-nks-gray-400 whitespace-nowrap">{o.paidAt ? formatDate(o.paidAt) : '—'}</td>
                    </tr>
                  ))}
                  {(data?.recentOrders.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-nks-gray-400">
                        Nenhum pedido pago neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
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
