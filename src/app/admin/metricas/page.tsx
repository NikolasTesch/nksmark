'use client'

import * as React from 'react'
import { useState } from 'react'
import { useAdminMetrics } from '@/hooks/useAdminMetrics'
import { 
  TrendingUp, 
  TrendingDown, 
  DownloadCloud, 
  Users, 
  ImageIcon, 
  Calendar, 
  Filter, 
  BarChart3, 
  ArrowUpRight, 
  Loader2, 
  ChevronRight,
  BookOpen
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatsCard } from '@/components/admin/StatsCard'

export default function AdminMetricsPage() {
  const { data, loading, error, filters, setFilters } = useAdminMetrics()
  const [hoveredDay, setHoveredDay] = useState<{ day: number; count: number; x: number; y: number } | null>(null)

  const stats = data?.stats || {
    totalDownloads: 0,
    avgDownloadsPerDay: 0,
    avgDownloadsPerUser: 0,
    avgDownloadsPerArtwork: 0,
    totalActiveUsers: 0,
    percentChangeFromPrevMonth: 0
  }

  const dailyTrend = data?.dailyTrend || []
  const formatDistribution = data?.formatDistribution || []
  const categoryDistribution = data?.categoryDistribution || []
  const topArtworks = data?.topArtworks || []
  const categories = data?.categories || []

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ]

  const years = [2026, 2025, 2024]

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Chart measurements
  const chartHeight = 180
  const chartWidth = 740
  const paddingLeft = 40
  const paddingTop = 20
  const paddingBottom = 20
  const maxCount = Math.max(...dailyTrend.map(d => d.count), 5)
  const daysInMonth = dailyTrend.length

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-extrabold uppercase tracking-tight text-nks-black mb-1.5 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-nks-red" /> Métricas e Indicadores
          </h1>
          <p className="text-xs font-semibold text-nks-gray-700">
            Análise detalhada de downloads, médias e engajamento da equipe FASE.
          </p>
        </div>
      </div>

      {/* Filters Container */}
      <div className="bg-white border border-nks-gray-200 rounded-sm p-5 shadow-nks-sm flex flex-col gap-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-nks-red" /> Filtros de Seleção
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Month Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-nks-gray-700 uppercase">Mês de Referência</label>
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', parseInt(e.target.value))}
              className="w-full text-xs font-semibold text-nks-black bg-nks-gray-100/50 border border-nks-gray-200 rounded-sm px-3 py-2.5 focus:outline-none focus:border-nks-red transition-colors"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-nks-gray-700 uppercase">Ano</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
              className="w-full text-xs font-semibold text-nks-black bg-nks-gray-100/50 border border-nks-gray-200 rounded-sm px-3 py-2.5 focus:outline-none focus:border-nks-red transition-colors"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-nks-gray-700 uppercase">Categoria</label>
            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              className="w-full text-xs font-semibold text-nks-black bg-nks-gray-100/50 border border-nks-gray-200 rounded-sm px-3 py-2.5 focus:outline-none focus:border-nks-red transition-colors"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

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
          
          {/* Metrics Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
            
            <div className="bg-white border border-nks-gray-200 rounded-sm p-5 shadow-nks-sm relative overflow-hidden flex flex-col justify-between min-h-[105px]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">Downloads no Mês</span>
                <h3 className="font-display text-[26px] font-black tracking-tight text-nks-black mt-1">{stats.totalDownloads}</h3>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {stats.percentChangeFromPrevMonth >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-sm border border-emerald-200/50">
                    <TrendingUp className="h-3 w-3" /> +{stats.percentChangeFromPrevMonth}%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-nks-red-subtle/50 text-nks-red px-1.5 py-0.5 rounded-sm border border-nks-red/10">
                    <TrendingDown className="h-3 w-3" /> {stats.percentChangeFromPrevMonth}%
                  </span>
                )}
                <span className="text-[9px] text-nks-gray-400 font-semibold">vs mês anterior</span>
              </div>
              <div className="absolute right-4 top-4 text-nks-red/10">
                <DownloadCloud className="h-9 w-9 stroke-[1.5]" />
              </div>
            </div>

            <StatsCard
              title="Média Diária"
              value={stats.avgDownloadsPerDay}
              description="Downloads por dia ativo"
              icon={<Calendar className="h-4.5 w-4.5" />}
            />

            <StatsCard
              title="Média por Usuário"
              value={stats.avgDownloadsPerUser}
              description={`De ${stats.totalActiveUsers} usuários ativos`}
              icon={<Users className="h-4.5 w-4.5" />}
            />

            <StatsCard
              title="Downloads por Arte"
              value={stats.avgDownloadsPerArtwork}
              description="Média no catálogo visível"
              icon={<ImageIcon className="h-4.5 w-4.5" />}
            />

          </div>

          {/* Daily Trend Chart & Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                  <BarChart3 className="h-4.5 w-4.5 text-nks-red" /> Evolução de Downloads Diários
                </span>
                <span className="text-[9px] font-bold bg-nks-black text-white px-2 py-0.5 rounded-sm uppercase">
                  Mês {filters.month} / {filters.year}
                </span>
              </div>

              {/* Chart SVG */}
              <div className="relative w-full h-[220px] pt-4 select-none">
                {dailyTrend.length === 0 || stats.totalDownloads === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-nks-gray-200 rounded-sm bg-nks-gray-100/10 gap-2">
                    <BarChart3 className="h-8 w-8 text-nks-gray-400 stroke-[1.2]" />
                    <span className="text-xs text-nks-gray-400 font-semibold">Nenhum download registrado neste período.</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} 240`}>
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                        const y = paddingTop + ratio * chartHeight
                        const val = Math.round(maxCount * (1 - ratio))
                        return (
                          <g key={ratio} className="opacity-100">
                            <line 
                              x1={paddingLeft} 
                              y1={y} 
                              x2={chartWidth} 
                              y2={y} 
                              stroke="var(--color-nks-gray-200)" 
                              strokeWidth={index === 4 ? 1.5 : 1}
                              strokeDasharray={index === 4 ? "0" : "4 4"}
                            />
                            <text 
                              x={paddingLeft - 10} 
                              y={y + 4} 
                              fill="var(--color-nks-gray-400)" 
                              className="font-mono text-[9px] font-black text-right"
                              textAnchor="end"
                            >
                              {val}
                            </text>
                          </g>
                        )
                      })}

                      {/* Render Bars */}
                      {dailyTrend.map((d, index) => {
                        const step = (chartWidth - paddingLeft - 20) / daysInMonth
                        const barWidth = step * 0.7
                        const x = paddingLeft + index * step + step * 0.15
                        const barHeight = (d.count / maxCount) * chartHeight
                        const y = paddingTop + chartHeight - barHeight

                        return (
                          <g key={d.day}>
                            {/* Animated bar using framer-motion */}
                            <motion.rect
                              x={x}
                              y={y}
                              width={barWidth}
                              fill="var(--color-nks-red)"
                              opacity={hoveredDay?.day === d.day ? 0.95 : 0.75}
                              className="cursor-pointer transition-all duration-150"
                              onMouseEnter={() => setHoveredDay({ day: d.day, count: d.count, x: x + barWidth / 2, y })}
                              onMouseLeave={() => setHoveredDay(null)}
                              initial={{ height: 0, y: paddingTop + chartHeight }}
                              animate={{ height: barHeight, y }}
                              transition={{ duration: 0.5, delay: index * 0.01 }}
                            />
                            {/* X-axis indicators */}
                            {(d.day === 1 || d.day === 5 || d.day === 10 || d.day === 15 || d.day === 20 || d.day === 25 || d.day === daysInMonth) && (
                              <text
                                x={x + barWidth / 2}
                                y={paddingTop + chartHeight + 15}
                                fill="var(--color-nks-gray-700)"
                                className="font-mono text-[9px] font-black"
                                textAnchor="middle"
                              >
                                {d.day}
                              </text>
                            )}
                          </g>
                        )
                      })}
                    </svg>

                    {/* Tooltip Popup */}
                    <AnimatePresence>
                      {hoveredDay && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bg-nks-black text-white font-mono text-[10px] p-2.5 border border-white/10 rounded-sm shadow-nks-md pointer-events-none flex flex-col gap-0.5 z-10"
                          style={{
                            left: `${(hoveredDay.x / chartWidth) * 100}%`,
                            top: `${(hoveredDay.y / 240) * 100 - 24}%`,
                            transform: 'translateX(-50%)'
                          }}
                        >
                          <span className="font-bold text-nks-gray-400">Dia {hoveredDay.day.toString().padStart(2, '0')}</span>
                          <span className="font-black text-xs text-white uppercase">{hoveredDay.count} {hoveredDay.count === 1 ? 'Download' : 'Downloads'}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>

            {/* Formats Distribution */}
            <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-5 h-fit">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                <BookOpen className="h-4.5 w-4.5 text-nks-red" /> Formatos de Download
              </span>

              <div className="flex flex-col gap-3.5">
                {formatDistribution.map((item) => (
                  <div key={item.format} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-bold text-nks-black">
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-nks-black text-white font-black rounded-sm">{item.format}</span>
                      <span className="text-[11px] font-extrabold">{item.count} <span className="text-[9px] font-bold text-nks-gray-400">({item.percentage}%)</span></span>
                    </div>
                    <div className="w-full bg-nks-gray-100 h-2.5 rounded-none overflow-hidden">
                      <motion.div 
                        className="bg-nks-red h-full rounded-none"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}

                {formatDistribution.length === 0 && (
                  <div className="text-center text-xs text-nks-gray-400 py-10 border border-dashed border-nks-gray-200 rounded-sm bg-nks-gray-100/10">
                    Nenhum formato registrado.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Categories Breakdown & Top Artworks Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Category Performance */}
            <div className="lg:col-span-2 bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                <ImageIcon className="h-4.5 w-4.5 text-nks-red" /> Desempenho por Categoria
              </span>

              <div className="flex flex-col gap-4">
                {categoryDistribution.map((cat) => (
                  <div key={cat.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-nks-black">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span 
                          className="h-2.5 w-2.5 shrink-0" 
                          style={{ backgroundColor: cat.color || 'var(--color-nks-red)' }} 
                        />
                        {cat.name}
                      </span>
                      <span className="text-[11px] font-extrabold">{cat.count} <span className="text-[9px] font-bold text-nks-gray-400">({cat.percentage}%)</span></span>
                    </div>
                    <div className="w-full bg-nks-gray-100 h-2 rounded-none overflow-hidden">
                      <motion.div 
                        className="h-full rounded-none"
                        style={{ backgroundColor: cat.color || 'var(--color-nks-red)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}

                {categoryDistribution.length === 0 && (
                  <div className="text-center text-xs text-nks-gray-400 py-12 border border-dashed border-nks-gray-200 rounded-sm bg-nks-gray-100/10">
                    Nenhuma categoria registrada com downloads.
                  </div>
                )}
              </div>
            </div>

            {/* Top Downloaded Artworks */}
            <div className="lg:col-span-3 bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 flex items-center gap-1.5">
                <ArrowUpRight className="h-4.5 w-4.5 text-nks-red" /> Artes Mais Baixadas do Mês
              </span>

              <div className="flex flex-col gap-3 mt-2">
                {topArtworks.map((art, index) => (
                  <div 
                    key={art.id} 
                    className="flex items-center justify-between p-3.5 border border-nks-gray-100 rounded-sm bg-nks-gray-100/40 hover:bg-nks-gray-100/80 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-black text-nks-red shrink-0 w-5">
                        #{(index + 1)}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-nks-black truncate">{art.title}</span>
                        <span className="text-[9px] text-nks-gray-400 font-semibold uppercase tracking-wider">{art.categoryName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-extrabold text-nks-black">{art.downloadsCount}</span>
                      <span className="text-[9px] text-nks-gray-400 font-bold uppercase">Downloads</span>
                      <ChevronRight className="h-3.5 w-3.5 text-nks-gray-400" />
                    </div>
                  </div>
                ))}

                {topArtworks.length === 0 && (
                  <div className="text-center text-xs text-nks-gray-400 py-16 border border-dashed border-nks-gray-200 rounded-sm bg-nks-gray-100/10">
                    Nenhum download registrado de artes neste período.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}
