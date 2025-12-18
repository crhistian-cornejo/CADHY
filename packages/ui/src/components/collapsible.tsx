import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import * as React from "react"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  asChild,
  children,
  ...props
}: CollapsiblePrimitive.Trigger.Props & { asChild?: boolean }) {
  // Base UI 1.0 uses render prop instead of asChild
  // If asChild is true, we render the child directly with trigger props
  if (asChild && React.isValidElement(children)) {
    return (
      <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" render={children} {...props} />
    )
  }
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props}>
      {children}
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
