import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost"
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-violet-600 text-white hover: bg-violet-700 focus: ring-violet-500",
      outline: "border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
      ghost: "text-violet-600 hover: bg-violet-50 focus: ring-violet-500",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium",
          "transition-all duration-200 focus:outline-none focus: ring-2 focus:ring-offset-2",
          "disabled:opacity-50 disabled: cursor-not-allowed",  // ✅ CORRIGÉ : pas d'espace
          "cursor-pointer",  // ✅ AJOUTÉ : curseur pointer par défaut
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"