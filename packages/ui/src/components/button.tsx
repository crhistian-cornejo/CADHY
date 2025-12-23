import { cn } from "@cadhy/ui/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-2xl border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-2xl has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-2xl px-2 text-xs in-data-[slot=button-group]:rounded-2xl has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-2xl px-2.5 in-data-[slot=button-group]:rounded-2xl has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-2xl in-data-[slot=button-group]:rounded-2xl [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-2xl in-data-[slot=button-group]:rounded-2xl",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Button component props.
 * Uses native button props to ensure `type` attribute works correctly.
 * Base UI's Button was overriding `type="submit"` with `type="button"`.
 *
 * Supports `render` prop for composition with other elements (e.g., links, triggers).
 */
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render a different element with button styles.
   * Useful for rendering links or composing with other components.
   * The element receives all button props merged with its own props.
   */
  render?: React.ReactElement
}

/**
 * Native button component with consistent styling.
 * Forwards ref and respects all native button attributes including `type`.
 *
 * When `render` prop is provided, clones that element with button styles
 * and props merged, allowing composition with links or other triggers.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", render, ...props }, ref) => {
    const buttonClassName = cn(buttonVariants({ variant, size, className }))

    // If render prop is provided, clone that element with merged props
    if (render) {
      // Extract props from the render element
      const elementProps = (render as React.ReactElement<Record<string, unknown>>).props
      const mergedClassName = cn(buttonClassName, elementProps?.className as string | undefined)

      // Clone with merged props - render element props take precedence over button props
      // except for className which is merged
      return React.cloneElement(render as React.ReactElement<Record<string, unknown>>, {
        ...props,
        ...elementProps,
        "data-slot": "button",
        className: mergedClassName,
        ref,
      })
    }

    return <button data-slot="button" className={buttonClassName} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
export type { ButtonProps }
