import { cn } from "@cadhy/ui/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted rounded-2xl animate-pulse", className)}
      {...props}
    />
  )
}

export { Skeleton }
