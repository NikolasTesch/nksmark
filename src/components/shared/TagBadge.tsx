import * as React from 'react'
import { Badge } from '@/components/ui/badge'

interface TagBadgeProps {
  name: string
  onClick?: () => void
}

export function TagBadge({ name, onClick }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`font-normal text-xs px-2 py-0.5 rounded-md cursor-pointer transition-all hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 ${onClick ? 'active:scale-95' : ''}`}
      onClick={onClick}
    >
      #{name}
    </Badge>
  )
}
