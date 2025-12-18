/**
 * Features Section Component
 *
 * Showcases main features of CADHY.
 * Uses @cadhy/ui components and hugeicons.
 */

import { Card } from "@cadhy/ui"
import {
  AudioWaveIcon,
  ChartLineData02Icon,
  CubeIcon,
  DatabaseExportIcon,
  GasPipeIcon,
  SparklesIcon,
  StarsIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { useTranslation } from "@/lib/i18n"

const ICONS: Record<string, IconSvgElement> = {
  waves: AudioWaveIcon,
  pipeline: GasPipeIcon,
  sparkles: StarsIcon,
  chart: ChartLineData02Icon,
  cube: CubeIcon,
  "file-export": DatabaseExportIcon,
}

// Feature keys mapped to icon keys
const FEATURE_ICONS: Record<string, string> = {
  "3dModeling": "cube",
  hydraulicAnalysis: "waves",
  structures: "pipeline",
  waterSurface: "chart",
  cadExport: "file-export",
  aiAssistant: "sparkles",
}

export function FeaturesSection() {
  const { t } = useTranslation()

  // Build features from translations
  const features = [
    { key: "3dModeling", ...t.features["3dModeling"] },
    { key: "hydraulicAnalysis", ...t.features.hydraulicAnalysis },
    { key: "structures", ...t.features.structures },
    { key: "waterSurface", ...t.features.waterSurface },
    { key: "cadExport", ...t.features.cadExport },
    { key: "aiAssistant", ...t.features.aiAssistant },
  ]

  return (
    <section
      id="features"
      className="relative border-t border-border bg-muted/30 py-24 px-8 lg:px-16"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1 mb-6 rounded-full">
            <HugeiconsIcon icon={SparklesIcon} size={12} className="text-muted-foreground" />
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground">
              {t.features.badge}
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground mb-4">
            {t.features.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t.features.description}</p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <FeatureCard
              key={feature.key}
              title={feature.title}
              description={feature.description}
              icon={FEATURE_ICONS[feature.key] || "waves"}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  const IconComponent = ICONS[icon] || AudioWaveIcon

  return (
    <Card className="p-6 hover:border-primary/50 transition-colors">
      <div className="w-10 h-10 rounded-lg mb-4 bg-primary/10 text-primary flex items-center justify-center">
        <HugeiconsIcon icon={IconComponent} size={20} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  )
}
