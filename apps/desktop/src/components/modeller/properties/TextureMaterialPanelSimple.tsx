/**
 * TextureMaterialPanel - Simplified version for debugging
 */

import { PaintBrush01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTranslation } from "react-i18next"

export interface TextureMaterialPanelProps {
  postProcessingEnabled: boolean
}

export function TextureMaterialPanel({ postProcessingEnabled }: TextureMaterialPanelProps) {
  const { t } = useTranslation()

  if (!postProcessingEnabled) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={PaintBrush01Icon} className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("modeller.properties.textures.title", "PBR Textures")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Enable post-processing in viewport settings to use PBR textures.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={PaintBrush01Icon} className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t("modeller.properties.textures.title", "PBR Textures")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Texture panel - Coming soon!</p>
    </div>
  )
}
