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
import { FEATURES } from "@/lib/constants"

const ICONS: Record<string, IconSvgElement> = {
  waves: AudioWaveIcon,
  pipeline: GasPipeIcon,
  sparkles: StarsIcon,
  chart: ChartLineData02Icon,
  cube: CubeIcon,
  "file-export": DatabaseExportIcon,
}

export function FeaturesSection() {
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
              FEATURES
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tighter text-foreground mb-4">
            Everything You Need for Hydraulic Analysis
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From open channel flow to pressurized pipe networks, CADHY provides comprehensive tools
            for hydraulic engineering.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
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
