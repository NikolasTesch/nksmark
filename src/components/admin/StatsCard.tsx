import * as React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
}

export function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">{value}</span>
        {description && <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </div>
      {icon && (
        <div className="p-3 bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 rounded-full">
          {icon}
        </div>
      )}
    </div>
  )
}
