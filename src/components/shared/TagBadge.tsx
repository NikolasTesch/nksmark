import * as React from 'react'

interface TagBadgeProps {
  name: string
  onClick?: () => void
}

export function TagBadge({ name, onClick }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-mono text-xs px-[7px] py-0.5 rounded border border-nks-gray-200 text-nks-gray-700 bg-white hover:border-nks-black hover:text-nks-black transition-colors ${
        onClick ? 'cursor-pointer active:scale-95' : ''
      }`}
    >
      #{name}
    </span>
  )
}
