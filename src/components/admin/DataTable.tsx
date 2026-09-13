import * as React from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'

export type DataTableColumn<T> = {
  id: string
  header: string
  hideOnMobile?: boolean
  align?: 'left' | 'center' | 'right'
  headerClassName?: string
  cellClassName?: string
  render: (row: T) => React.ReactNode
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  emptyTitle: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  headerVariant?: 'dark' | 'light' | 'muted'
  className?: string
}

const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const

const HEADER: Record<NonNullable<DataTableProps<unknown>['headerVariant']>, string> = {
  dark: 'bg-nks-black text-white border-b border-nks-gray-200 font-display font-extrabold text-[11px] uppercase tracking-[0.08em]',
  light:
    'bg-white border-b border-nks-gray-200/80 font-display font-extrabold text-[10px] uppercase tracking-[0.12em] text-nks-gray-400',
  muted:
    'bg-nks-gray-100 text-nks-gray-700 border-b border-nks-gray-200 font-bold text-[10px] uppercase tracking-wider',
}

function isActionHeader(header: string) {
  return /aç/i.test(header)
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  headerVariant = 'dark',
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? Inbox}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  const mobileCols = columns.filter((c) => !c.hideOnMobile)

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="md:hidden divide-y divide-nks-gray-200">
        {rows.map((row) => (
          <div key={getRowKey(row)} className="p-4 flex flex-col gap-3">
            {mobileCols.map((col, i) => {
              const isPrimary = i === 0
              const isAction = isActionHeader(col.header)
              return (
                <div
                  key={col.id}
                  className={cn(
                    isAction
                      ? 'pt-1 flex justify-end'
                      : isPrimary
                        ? ''
                        : 'flex items-start justify-between gap-3',
                  )}
                >
                  {!isPrimary && !isAction && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-nks-gray-400 shrink-0 pt-0.5">
                      {col.header}
                    </span>
                  )}
                  <div className={cn(isPrimary || isAction ? 'w-full' : 'min-w-0 text-right')}>
                    {col.render(row)}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <table className="hidden md:table w-full text-left text-sm border-collapse">
        <thead>
          <tr className={HEADER[headerVariant]}>
            {columns.map((col) => (
              <th
                key={col.id}
                data-hide-on-mobile={col.hideOnMobile ? 'true' : undefined}
                className={cn(
                  'py-3.5 px-4',
                  ALIGN[col.align ?? 'left'],
                  col.hideOnMobile && 'hidden md:table-cell',
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-nks-gray-200">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="hover:bg-nks-gray-100/30 transition-colors">
              {columns.map((col) => (
                <td
                  key={col.id}
                  data-hide-on-mobile={col.hideOnMobile ? 'true' : undefined}
                  className={cn(
                    'py-3.5 px-4',
                    ALIGN[col.align ?? 'left'],
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.cellClassName,
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
