/**
 * Roadmap Page
 *
 * Full development roadmap with timeline and status badges.
 */

import {
  Calendar02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  RecordIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { SEO } from "@/components/seo"
import { useTranslation } from "@/lib/i18n"

interface RoadmapItem {
  titleEn: string
  titleEs: string
  descriptionEn: string
  descriptionEs: string
  status: "completed" | "in-progress" | "planned"
  quarter: string
}

const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    titleEn: "Core Hydraulics Engine",
    titleEs: "Motor Hidráulico Central",
    descriptionEn:
      "Manning equation, normal depth, critical depth, and Froude number calculations.",
    descriptionEs:
      "Ecuación de Manning, tirante normal, tirante crítico y cálculos del número de Froude.",
    status: "completed",
    quarter: "Oct 2025",
  },
  {
    titleEn: "Channel Section Types",
    titleEs: "Tipos de Sección de Canal",
    descriptionEn:
      "Rectangular, trapezoidal, circular, and parabolic cross-sections with geometry.",
    descriptionEs:
      "Secciones transversales rectangulares, trapezoidales, circulares y parabólicas con geometría.",
    status: "completed",
    quarter: "Oct 2025",
  },
  {
    titleEn: "GVF Analysis",
    titleEs: "Análisis FGV",
    descriptionEn:
      "Gradually Varied Flow profiles with M1, M2, S1, S2 classification and step method.",
    descriptionEs:
      "Perfiles de Flujo Gradualmente Variado con clasificación M1, M2, S1, S2 y método del paso.",
    status: "completed",
    quarter: "Nov 2025",
  },
  {
    titleEn: "Desktop Application",
    titleEs: "Aplicación de Escritorio",
    descriptionEn: "Tauri-based desktop app with React frontend and 3D visualization.",
    descriptionEs:
      "Aplicación de escritorio basada en Tauri con frontend React y visualización 3D.",
    status: "completed",
    quarter: "Nov 2025",
  },
  {
    titleEn: "AI Chat System",
    titleEs: "Sistema de Chat IA",
    descriptionEn:
      "Multi-provider support (Claude, GPT, Gemini), streaming responses, and tool calling.",
    descriptionEs:
      "Soporte multi-proveedor (Claude, GPT, Gemini), respuestas en streaming y llamadas a herramientas.",
    status: "completed",
    quarter: "Dec 2025",
  },
  {
    titleEn: "v0.1.0 Public Release",
    titleEs: "Lanzamiento Público v0.1.0",
    descriptionEn: "First public release with signed installers for Windows, macOS, and Linux.",
    descriptionEs:
      "Primer lanzamiento público con instaladores firmados para Windows, macOS y Linux.",
    status: "completed",
    quarter: "Dec 2025",
  },
  {
    titleEn: "Pipe Network Analysis",
    titleEs: "Análisis de Redes de Tuberías",
    descriptionEn: "Hardy-Cross and gradient methods for pressurized pipe systems.",
    descriptionEs: "Métodos Hardy-Cross y gradiente para sistemas de tuberías presurizadas.",
    status: "in-progress",
    quarter: "Q1 2026",
  },
  {
    titleEn: "Export & Reports",
    titleEs: "Exportación y Reportes",
    descriptionEn: "PDF reports, DXF/CAD export, STEP files, and calculation summaries.",
    descriptionEs: "Reportes PDF, exportación DXF/CAD, archivos STEP y resúmenes de cálculos.",
    status: "planned",
    quarter: "Q2 2026",
  },
]

function StatusIcon({ status }: { status: RoadmapItem["status"] }) {
  switch (status) {
    case "completed":
      return <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} className="text-green-500" />
    case "in-progress":
      return <HugeiconsIcon icon={Clock01Icon} size={20} className="text-amber-500 animate-pulse" />
    case "planned":
      return <HugeiconsIcon icon={RecordIcon} size={20} className="text-muted-foreground" />
  }
}

function StatusBadge({
  status,
  labels,
}: {
  status: RoadmapItem["status"]
  labels: { completed: string; inProgress: string; planned: string }
}) {
  const styles = {
    completed:
      "border-green-600/50 text-green-600 dark:border-green-500/50 dark:text-green-400 bg-green-500/10",
    "in-progress":
      "border-amber-600/50 text-amber-600 dark:border-amber-500/50 dark:text-amber-400 bg-amber-500/10",
    planned: "border-border text-muted-foreground bg-muted/30",
  }

  const statusLabels = {
    completed: labels.completed,
    "in-progress": labels.inProgress,
    planned: labels.planned,
  }

  return (
    <span
      className={`text-[10px] font-bold tracking-widest px-2 py-1 border rounded ${styles[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}

export default function RoadmapPage() {
  const { t, language } = useTranslation()

  const seoDescription =
    language === "es"
      ? "Hoja de ruta de desarrollo de CADHY. Sigue los hitos completados y las próximas características para ingeniería hidráulica."
      : "CADHY development roadmap. Track completed milestones and upcoming features for hydraulic engineering."

  const statusLabels = {
    completed: t.roadmap.completed,
    inProgress: t.roadmap.inProgress,
    planned: t.roadmap.planned,
  }

  return (
    <>
      <SEO title={language === "es" ? "Hoja de Ruta" : "Roadmap"} description={seoDescription} />

      <div className="py-16 px-8 lg:px-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1 mb-6 rounded-full">
              <HugeiconsIcon icon={Target01Icon} size={12} className="text-muted-foreground" />
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground">
                {t.roadmap.badge}
              </span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter text-foreground mb-4">
              {t.roadmap.title}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t.roadmap.description}</p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-0 lg:left-1/2 top-0 bottom-0 w-px bg-border transform lg:-translate-x-1/2" />

            <div className="space-y-8">
              {ROADMAP_ITEMS.map((item, index) => (
                <div
                  key={item.titleEn}
                  className={`relative flex flex-col lg:flex-row gap-8 ${
                    index % 2 === 0 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  {/* Timeline Node */}
                  <div className="absolute left-0 lg:left-1/2 transform -translate-x-1/2 w-10 h-10 bg-background border border-border flex items-center justify-center z-10 rounded-full">
                    <StatusIcon status={item.status} />
                  </div>

                  {/* Content Card */}
                  <div
                    className={`ml-14 lg:ml-0 lg:w-[calc(50%-2rem)] ${
                      index % 2 === 0 ? "lg:mr-auto lg:pr-8" : "lg:ml-auto lg:pl-8"
                    }`}
                  >
                    <div className="group border border-border bg-card p-6 hover:border-foreground/30 transition-all rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <HugeiconsIcon icon={Calendar02Icon} size={12} />
                          <span className="text-[10px] font-bold tracking-widest">
                            {item.quarter}
                          </span>
                        </div>
                        <StatusBadge status={item.status} labels={statusLabels} />
                      </div>
                      <h3 className="text-lg font-bold text-foreground tracking-tight mb-2">
                        {language === "es" ? item.titleEs : item.titleEn}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {language === "es" ? item.descriptionEs : item.descriptionEn}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="mt-16 text-center">
            <a
              href="https://github.com/crhistian-cornejo/CADHY/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground hover:text-foreground transition-colors border border-border px-6 py-3 hover:border-foreground/50 rounded-full"
            >
              <span>{t.roadmap.suggestFeature}</span>
              <span>&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
