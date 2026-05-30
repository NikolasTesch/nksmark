import * as React from 'react'

interface CategoryBadgeProps {
  name: string
  color?: string | null
}

// Badge de categoria: preto editorial (#111), uppercase com tracking largo,
// borda reta (radius-sm). A cor da marca emoldura; o conteúdo é o protagonista.
export function CategoryBadge({ name }: CategoryBadgeProps) {
  return (
    <span className="inline-flex items-center bg-nks-black text-white rounded-sm px-[9px] py-1 text-[11px] font-medium uppercase tracking-[0.11em]">
      {name}
    </span>
  )
}
