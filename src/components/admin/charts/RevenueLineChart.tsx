'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatBRL } from '@/lib/utils/format'

interface RevenueLineChartProps {
  data: { date: string; revenueCents: number; orderCount: number }[]
}

export function RevenueLineChart({ data }: RevenueLineChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    revenue: d.revenueCents / 100,
  }))

  return (
    <div className="bg-white border border-nks-gray-200 rounded-sm p-6 shadow-nks-sm">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400 mb-4 block">
        Receita Diária
      </span>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-nks-gray-200)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--color-nks-gray-700)' }}
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            }
            stroke="var(--color-nks-gray-200)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-nks-gray-700)' }}
            tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
            stroke="var(--color-nks-gray-200)"
          />
          <Tooltip
            formatter={(value: unknown) => formatBRL(typeof value === 'number' ? Math.round(value * 100) : 0)}
            labelFormatter={(label: unknown) =>
              new Date(typeof label === 'string' ? label : String(label)).toLocaleDateString('pt-BR')
            }
            contentStyle={{
              backgroundColor: 'var(--color-nks-black)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '2px',
              fontSize: '11px',
              color: 'var(--color-nks-white)',
            }}
            itemStyle={{ color: 'var(--color-nks-white)' }}
            labelStyle={{ color: 'var(--color-nks-gray-400)', fontWeight: 700 }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-nks-red)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-nks-red)' }}
            activeDot={{ r: 5 }}
            name="Receita"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
