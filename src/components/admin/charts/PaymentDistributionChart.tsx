'use client'

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { formatBRL } from '@/lib/utils/format'

interface PaymentDistribution {
  method: string
  count: number
  totalCents: number
  percentage: number
}

interface PaymentDistributionChartProps {
  data: PaymentDistribution[]
}

const METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  boleto: 'Boleto',
  unknown: 'Outro',
}

// Payment-method semantic colors. Distinct from brand palette on purpose:
// these encode industry conventions so the chart is instantly legible.
const METHOD_COLORS: Record<string, string> = {
  pix: '#10B981',
  credit_card: '#3B82F6',
  debit_card: '#6366F1',
  boleto: '#F59E0B',
  unknown: '#9CA3AF',
}

const FALLBACK_COLOR = '#9CA3AF'

interface TooltipPayloadEntry {
  payload?: PaymentDistribution
  name?: string
  value?: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]?.payload
  if (!item) return null

  return (
    <div className="bg-nks-black text-white border border-white/10 rounded-sm shadow-nks-md px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">
        {METHOD_LABELS[item.method] || item.method}
      </span>
      <span className="text-xs font-black">{formatBRL(item.totalCents)}</span>
      <span className="text-[10px] font-semibold text-nks-gray-400">
        {item.percentage}% · {item.count} {item.count === 1 ? 'venda' : 'vendas'}
      </span>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLegendText(value: string, entry: { payload?: any }) {
  if (!entry?.payload) return value
  const label = METHOD_LABELS[entry.payload.method] || entry.payload.method
  return `${label} — ${entry.payload.percentage}%`
}

export function PaymentDistributionChart({ data }: PaymentDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.totalCents, 0)

  return (
    <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 mb-4 block">
        Métodos de Pagamento
      </span>
      <div className="flex flex-col gap-3">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="totalCents"
              nameKey="method"
              stroke="var(--color-nks-white)"
              strokeWidth={2}
              isAnimationActive
            >
              {data.map((entry) => (
                <Cell
                  key={entry.method}
                  fill={METHOD_COLORS[entry.method] || FALLBACK_COLOR}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-nks-gray-700)',
              }}
              formatter={renderLegendText}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center -mt-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 block">
            Total
          </span>
          <span className="font-display text-[18px] font-black text-nks-black block">
            {formatBRL(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
