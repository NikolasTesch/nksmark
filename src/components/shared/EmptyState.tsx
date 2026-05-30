import * as React from 'react'
import { Inbox, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title?: string
  description?: string
  onReset?: () => void
}

export function EmptyState({
  title = 'Nenhuma arte encontrada',
  description = 'Tente ajustar seus filtros de busca ou limpe as seleções atuais.',
  onReset,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl max-w-lg mx-auto my-6 animate-in fade-in duration-300">
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full mb-4">
        <Inbox className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">{description}</p>
      {onReset && (
        <Button onClick={onReset} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}
