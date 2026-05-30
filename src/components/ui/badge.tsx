import * as React from "react"
import { cn } from "@/lib/utils/cn"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-nks-black text-white hover:bg-nks-black/90",
    secondary: "border-transparent bg-nks-gray-100 text-nks-black hover:bg-nks-gray-200",
    destructive: "border-transparent bg-nks-red text-white hover:bg-nks-red-dark",
    outline: "border border-nks-gray-200 bg-transparent text-nks-gray-700 hover:bg-nks-gray-100",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-nks-red-subtle",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
