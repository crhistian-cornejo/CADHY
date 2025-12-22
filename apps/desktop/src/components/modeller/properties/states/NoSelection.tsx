/**
 * NoSelection Component - CADHY
 *
 * Empty state when no object is selected.
 */

import { CubeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTranslation } from "react-i18next"

export function NoSelection() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <HugeiconsIcon icon={CubeIcon} className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">{t("properties.noSelection")}</h3>
      <p className="text-xs text-muted-foreground">{t("properties.noSelectionDesc")}</p>
    </div>
  )
}
