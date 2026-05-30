import * as React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
}

export function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <div className="bg-white border border-nks-gray-200 p-5 rounded-sm shadow-nks-sm flex items-center justify-between">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-nks-gray-400">{title}</span>
        <span className="font-display text-2xl font-extrabold uppercase tracking-tight text-nks-black">{value}</span>
        {description && <span className="text-[11px] text-nks-gray-750 font-medium">{description}</span>}
      </div>
      {icon && (
        <div className="p-3 bg-nks-red-subtle text-nks-red rounded-sm flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
    </div>
  )
}
