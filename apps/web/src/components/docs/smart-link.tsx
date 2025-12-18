/**
 * Smart Link Component
 *
 * Automatically handles internal vs external links.
 */

import { cn } from "@cadhy/ui"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link as RouterLink } from "react-router-dom"

export interface SmartLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string
  external?: boolean
  noIcon?: boolean
}

export function SmartLink({
  href,
  children,
  className,
  external,
  noIcon,
  ...props
}: SmartLinkProps) {
  const isExternal =
    external ||
    (href && (href.startsWith("http") || href.startsWith("https") || href.startsWith("mailto:")))
  const isAnchor = href?.startsWith("#")

  // Base styles matching the previous documentation link style
  const baseStyles =
    "text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors decoration-border hover:decoration-muted-foreground"

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(baseStyles, "inline-flex items-center gap-1", className)}
        {...props}
      >
        <span>{children}</span>
        {!noIcon && (
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} className="inline-block opacity-70" />
        )}
      </a>
    )
  }

  if (isAnchor) {
    return (
      <a href={href} className={cn(baseStyles, className)} {...props}>
        {children}
      </a>
    )
  }

  return (
    <RouterLink to={href || "#"} className={cn(baseStyles, className)} {...props}>
      {children}
    </RouterLink>
  )
}
