import { type ClassValue, clsx } from "clsx"
import type { ButtonHTMLAttributes } from "react"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface HamburgerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean
}

export function Hamburger({ open, className, ...props }: HamburgerProps) {
  return (
    <button
      type="button"
      className={cn(
        "group relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground transition-colors",
        className
      )}
      aria-expanded={open}
      aria-label={open ? "Close menu" : "Open menu"}
      {...props}
    >
      <div className="relative flex h-3.5 w-4 flex-col justify-between overflow-hidden">
        <span
          className={cn(
            "h-0.5 w-full bg-current transform transition-all duration-300 ease-in-out origin-center",
            open ? "translate-y-[6px] rotate-45" : "translate-y-0 rotate-0"
          )}
        />
        <span
          className={cn(
            "h-0.5 w-full bg-current transform transition-all duration-300 ease-in-out",
            open ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
          )}
        />
        <span
          className={cn(
            "h-0.5 w-full bg-current transform transition-all duration-300 ease-in-out origin-center",
            open ? "-translate-y-[6px] -rotate-45" : "translate-y-0 rotate-0"
          )}
        />
      </div>
    </button>
  )
}
