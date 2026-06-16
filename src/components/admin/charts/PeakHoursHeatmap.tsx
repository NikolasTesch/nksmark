'use client'

import { useMemo, useState } from 'react'
import { formatBRL } from '@/lib/utils/format'

interface PeakHourEntry {
  dayOfWeek: number
  hour: number
  count: number
  revenueCents: number
}

interface PeakHoursHeatmapProps {
  data: PeakHourEntry[]
}

const DAY_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
}

// Display order: Monday → Sunday (Brazilian week convention).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// Brand red as the heat color; alpha is driven by intensity.
const HEAT_BASE = '179, 18, 23' // RGB triplet of var(--color-nks-red)

interface HoverState {
  day: number
  hour: number
  count: number
  revenueCents: number
}

function intensity(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0
  // Square-root scaling flattens peaks so mid-range cells stay legible.
  return Math.pow(count / max, 0.6)
}

function cellStyle(count: number, max: number): React.CSSProperties {
  const i = intensity(count, max)
  if (i === 0) {
    return { backgroundColor: 'var(--color-nks-gray-100)' }
  }
  return {
    backgroundColor: `rgba(${HEAT_BASE}, ${0.12 + i * 0.78})`,
  }
}

function valueTextStyle(count: number, max: number): string {
  return intensity(count, max) > 0.55 ? 'text-white' : 'text-nks-black'
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  const [hover, setHover] = useState<HoverState | null>(null)

  const lookup = useMemo(() => {
    const map = new Map<string, PeakHourEntry>()
    for (const entry of data) {
      map.set(`${entry.dayOfWeek}-${entry.hour}`, entry)
    }
    return map
  }, [data])

  const max = useMemo(
    () => data.reduce((m, d) => (d.count > m ? d.count : m), 0),
    [data]
  )

  const totalCount = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data])
  const totalRevenue = useMemo(
    () => data.reduce((s, d) => s + d.revenueCents, 0),
    [data]
  )

  return (
    <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">
          Picos de Compra · Dia × Hora
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-nks-gray-400">
            Menos
          </span>
          <div className="flex h-3 overflow-hidden border border-nks-gray-200">
            {[0.1, 0.3, 0.55, 0.8, 1].map((alpha) => (
              <div
                key={alpha}
                className="w-3 h-full"
                style={{ backgroundColor: `rgba(${HEAT_BASE}, ${alpha})` }}
              />
            ))}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-nks-gray-400">
            Mais
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[680px] flex flex-col gap-1">
          {/* Hour header row */}
          <div className="grid grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-[2px]">
            <div />
            {HOURS.map((h) => (
              <div
                key={`hour-${h}`}
                className="text-center text-[9px] font-bold text-nks-gray-400 font-mono"
              >
                {h.toString().padStart(2, '0')}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAY_ORDER.map((day) => (
            <div
              key={`day-${day}`}
              className="grid grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-[2px]"
            >
              <div className="flex items-center justify-end pr-2">
                <span className="text-[10px] font-bold text-nks-gray-700 uppercase tracking-wider">
                  {DAY_LABELS[day]}
                </span>
              </div>
              {HOURS.map((hour) => {
                const entry = lookup.get(`${day}-${hour}`)
                const count = entry?.count ?? 0
                const revenueCents = entry?.revenueCents ?? 0
                return (
                  <div
                    key={`cell-${day}-${hour}`}
                    className={`relative h-5 cursor-default border border-nks-gray-200/40 rounded-[1px] flex items-center justify-center text-[8px] font-black ${valueTextStyle(
                      count,
                      max
                    )}`}
                    style={cellStyle(count, max)}
                    onMouseEnter={() =>
                      setHover({ day, hour, count, revenueCents })
                    }
                    onMouseLeave={() => setHover((h) => (h && h.day === day && h.hour === hour ? null : h))}
                    title={`${DAY_LABELS[day]} · ${hour.toString().padStart(2, '0')}h · ${count} ${count === 1 ? 'venda' : 'vendas'}`}
                  >
                    {count > 0 ? count : ''}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip / summary line */}
      <div className="flex items-center justify-between gap-3 border-t border-nks-gray-200 pt-3 mt-1">
        <div className="flex flex-col gap-0.5 min-w-0">
          {hover && hover.count > 0 ? (
            <>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">
                {DAY_LABELS[hover.day]} · {hover.hour.toString().padStart(2, '0')}:00
              </span>
              <span className="text-xs font-black text-nks-black">
                {hover.count} {hover.count === 1 ? 'venda' : 'vendas'} ·{' '}
                <span className="text-nks-red">{formatBRL(hover.revenueCents)}</span>
              </span>
            </>
          ) : (
            <span className="text-[10px] font-semibold text-nks-gray-400">
              Passe o mouse sobre uma célula para ver detalhes.
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">
            Período total
          </span>
          <span className="text-xs font-black text-nks-black">
            {totalCount} {totalCount === 1 ? 'venda' : 'vendas'}
          </span>
          <span className="text-[10px] font-bold text-nks-gray-400">
            {formatBRL(totalRevenue)}
          </span>
        </div>
      </div>
    </div>
  )
}
