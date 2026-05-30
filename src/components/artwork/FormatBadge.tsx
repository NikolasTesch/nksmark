import * as React from 'react'

interface FormatBadgeProps {
  format: 'CDR' | 'AI' | 'PDF' | 'OTF' | 'PNG' | 'JPG' | string
  className?: string
}

// Badges de formato são monocromáticos (mono, preto sobre branco, borda fina)
// — mantêm o foco na arte, conforme a especificação NKS Art.
export function FormatBadge({ format, className }: FormatBadgeProps) {
  const extension = format.toUpperCase()

  return (
    <span
      className={`inline-flex items-center px-[7px] py-0.5 rounded-sm text-[10px] font-medium tracking-[0.04em] font-mono border border-nks-gray-200 bg-white text-nks-black ${className || ''}`}
    >
      {extension}
    </span>
  )
}
