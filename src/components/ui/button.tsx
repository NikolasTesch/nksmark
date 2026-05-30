import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // NKS Art — vermelho só para ação, preto editorial, bordas retas
    const variantStyles = {
      default: "bg-nks-red text-white hover:bg-nks-red-dark",
      destructive: "bg-nks-red text-white hover:bg-nks-red-dark",
      outline: "border border-nks-red bg-transparent text-nks-red hover:bg-nks-red-subtle",
      secondary: "bg-nks-black text-white hover:bg-nks-gray-900",
      ghost: "border border-nks-gray-200 bg-white text-nks-gray-700 hover:bg-nks-gray-100",
      link: "text-nks-red underline-offset-4 hover:underline hover:text-nks-red-dark",
    }

    const sizeStyles = {
      default: "h-10 px-[18px] py-2 text-sm",
      sm: "h-8 px-[13px] text-[13px]",
      lg: "h-12 px-8 text-[15px]",
      icon: "h-10 w-10",
    }

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded text-sm font-medium transition-all duration-[160ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nks-red-subtle disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] whitespace-nowrap",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
