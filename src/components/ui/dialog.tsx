import * as React from "react"
import { cn } from "@/lib/utils/cn"
import { X } from "lucide-react"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={() => onOpenChange?.(false)} 
      />
      <div className="relative z-10 w-full max-w-lg p-6 bg-white border border-nks-gray-200 rounded shadow-nks-lg animate-in fade-in zoom-in duration-200">
        {children}
      </div>
    </div>
  )
}

export function DialogContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex flex-col gap-4", className)}>{children}</div>
}

export function DialogHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  return <h3 className={cn("text-lg font-display font-bold uppercase tracking-[-0.015em] text-nks-black", className)}>{children}</h3>
}

export function DialogDescription({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={cn("text-sm text-nks-gray-700", className)}>{children}</p>
}

export function DialogFooter({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)}>{children}</div>
}

export function DialogClose({ onClick, className }: { onClick?: () => void, className?: string }) {
  return (
    <button 
      onClick={onClick} 
      className={cn("absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none text-nks-gray-400 hover:text-nks-black", className)}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Fechar</span>
    </button>
  )
}
