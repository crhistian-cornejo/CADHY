/**
 * ViewButton Component
 *
 * Button for camera view selection with tooltip.
 */

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@cadhy/ui"
import type { Home01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import React from "react"
import type { CameraView } from "@/stores/modeller-store"

export interface ViewButtonProps {
  view: CameraView
  icon: typeof Home01Icon
  label: string
  currentView: CameraView
  onClick: (view: CameraView) => void
}

export const ViewButton = React.memo(function ViewButton({
  view,
  icon,
  label,
  currentView,
  onClick,
}: ViewButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={currentView === view ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onClick(view)}
            className="h-7 w-7"
          >
            <HugeiconsIcon icon={icon} className="size-4" />
          </Button>
        }
      />
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
})

export default ViewButton
