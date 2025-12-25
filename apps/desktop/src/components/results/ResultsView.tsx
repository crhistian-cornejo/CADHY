/**
 * Results View - CADHY
 *
 * Main page for viewing simulation results with:
 * - Spreadsheet for data export
 * - Charts for visualization
 * - Export to Excel/CSV/PDF
 */

import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cadhy/ui"
import {
  ChartLineData02Icon,
  CheckmarkCircle01Icon,
  Download01Icon,
  File01Icon,
  FileExportIcon,
  RefreshIcon,
  TableIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "motion/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

// ============================================================================
// TYPES
// ============================================================================

interface ResultsViewProps {
  className?: string
}

interface SimulationResult {
  id: string
  name: string
  type: "steady" | "unsteady"
  runAt: Date
  stations: ResultStation[]
}

interface ResultStation {
  station: number
  wse: number
  velocity: number
  area: number
  froude: number
  depth: number
  topWidth: number
  wettedPerimeter: number
  hydraulicRadius: number
  energyGrade: number
  criticalDepth: number
  regime: "subcritical" | "critical" | "supercritical"
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockResults: SimulationResult = {
  id: "result-1",
  name: "Steady Flow - Design Q",
  type: "steady",
  runAt: new Date(),
  stations: [
    {
      station: 0,
      wse: 100.85,
      velocity: 1.42,
      area: 3.52,
      froude: 0.67,
      depth: 0.85,
      topWidth: 4.55,
      wettedPerimeter: 5.05,
      hydraulicRadius: 0.7,
      energyGrade: 100.95,
      criticalDepth: 0.62,
      regime: "subcritical",
    },
    {
      station: 50,
      wse: 100.8,
      velocity: 1.45,
      area: 3.45,
      froude: 0.69,
      depth: 0.83,
      topWidth: 4.49,
      wettedPerimeter: 4.95,
      hydraulicRadius: 0.69,
      energyGrade: 100.91,
      criticalDepth: 0.62,
      regime: "subcritical",
    },
    {
      station: 100,
      wse: 100.75,
      velocity: 1.48,
      area: 3.38,
      froude: 0.71,
      depth: 0.81,
      topWidth: 4.43,
      wettedPerimeter: 4.86,
      hydraulicRadius: 0.68,
      energyGrade: 100.86,
      criticalDepth: 0.62,
      regime: "subcritical",
    },
    {
      station: 150,
      wse: 100.7,
      velocity: 1.51,
      area: 3.31,
      froude: 0.73,
      depth: 0.79,
      topWidth: 4.37,
      wettedPerimeter: 4.77,
      hydraulicRadius: 0.67,
      energyGrade: 100.82,
      criticalDepth: 0.62,
      regime: "subcritical",
    },
    {
      station: 200,
      wse: 100.65,
      velocity: 1.54,
      area: 3.24,
      froude: 0.75,
      depth: 0.77,
      topWidth: 4.31,
      wettedPerimeter: 4.68,
      hydraulicRadius: 0.66,
      energyGrade: 100.77,
      criticalDepth: 0.62,
      regime: "subcritical",
    },
    {
      station: 250,
      wse: 100.6,
      velocity: 1.57,
      area: 3.18,
      froude: 0.77,
      depth: 0.75,
      topWidth: 4.25,
      wettedPerimeter: 4.6,
      hydraulicRadius: 0.65,
      energyGrade: 100.73,
      criticalDepth: 0.62,
      regime: "subcritical",
    },
  ],
}

// ============================================================================
// SPREADSHEET COMPONENT
// ============================================================================

function ResultsSpreadsheet({ result }: { result: SimulationResult }) {
  const { t } = useTranslation()

  const columns = [
    { key: "station", label: t("results.columns.station", "Station"), unit: "m" },
    { key: "wse", label: t("results.columns.wse", "WSE"), unit: "m" },
    { key: "depth", label: t("results.columns.depth", "Depth"), unit: "m" },
    { key: "velocity", label: t("results.columns.velocity", "Velocity"), unit: "m/s" },
    { key: "area", label: t("results.columns.area", "Area"), unit: "m²" },
    { key: "froude", label: t("results.columns.froude", "Fr"), unit: "-" },
    { key: "topWidth", label: t("results.columns.topWidth", "T"), unit: "m" },
    { key: "wettedPerimeter", label: t("results.columns.wp", "WP"), unit: "m" },
    { key: "hydraulicRadius", label: t("results.columns.hr", "Rh"), unit: "m" },
    { key: "energyGrade", label: t("results.columns.egl", "EGL"), unit: "m" },
    { key: "regime", label: t("results.columns.regime", "Regime"), unit: "" },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      {/* Spreadsheet */}
      <ScrollArea className="flex-1">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
            <tr>
              <th className="w-10 p-2 border-r border-b text-center text-muted-foreground font-medium text-xs">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="min-w-[85px] p-2 border-r border-b text-center font-medium text-xs"
                >
                  <div className="text-foreground">{col.label}</div>
                  {col.unit && (
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                      ({col.unit})
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.stations.map((station, i) => (
              <motion.tr
                key={station.station}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="p-2 border-r border-b text-center text-muted-foreground text-xs font-medium">
                  {i + 1}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums font-medium text-primary">
                  {station.station.toFixed(0)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.wse.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.depth.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.velocity.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.area.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.froude.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.topWidth.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.wettedPerimeter.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.hydraulicRadius.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-right tabular-nums">
                  {station.energyGrade.toFixed(2)}
                </td>
                <td className="p-2 border-r border-b text-center">
                  <Badge
                    variant={station.regime === "subcritical" ? "secondary" : "destructive"}
                    className="text-[10px] px-2"
                  >
                    {station.regime === "subcritical"
                      ? "Sub"
                      : station.regime === "critical"
                        ? "Crit"
                        : "Super"}
                  </Badge>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </motion.div>
  )
}

// ============================================================================
// CHART PLACEHOLDER
// ============================================================================

function ProfileChart() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <HugeiconsIcon icon={ChartLineData02Icon} className="size-4 text-primary" />
        </div>
        <span className="text-sm font-medium">
          {t("results.profileChart", "Water Surface Profile")}
        </span>
      </div>
      <div className="flex-1 rounded-2xl bg-muted/30 border border-dashed flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 rounded-2xl bg-muted/50 p-5 w-fit">
            <HugeiconsIcon icon={ChartLineData02Icon} className="size-10 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("results.chartPlaceholder", "Profile chart will render here")}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t("results.chartDesc", "WSE, EGL, and channel bottom")}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// SUMMARY PANEL
// ============================================================================

function SummaryPanel({ result }: { result: SimulationResult }) {
  const { t } = useTranslation()

  // Calculate summary stats
  const minDepth = Math.min(...result.stations.map((s) => s.depth))
  const maxDepth = Math.max(...result.stations.map((s) => s.depth))
  const avgVelocity =
    result.stations.reduce((sum, s) => sum + s.velocity, 0) / result.stations.length
  const maxFroude = Math.max(...result.stations.map((s) => s.froude))
  const allSubcritical = result.stations.every((s) => s.regime === "subcritical")

  const stats = [
    {
      label: t("results.summary.minDepth", "Min Depth"),
      value: `${minDepth.toFixed(2)} m`,
      status: "neutral",
    },
    {
      label: t("results.summary.maxDepth", "Max Depth"),
      value: `${maxDepth.toFixed(2)} m`,
      status: "neutral",
    },
    {
      label: t("results.summary.avgVelocity", "Avg Velocity"),
      value: `${avgVelocity.toFixed(2)} m/s`,
      status: avgVelocity > 3 ? "warning" : "success",
    },
    {
      label: t("results.summary.maxFroude", "Max Froude"),
      value: maxFroude.toFixed(2),
      status: maxFroude >= 1 ? "warning" : "success",
    },
    {
      label: t("results.summary.regime", "Flow Regime"),
      value: allSubcritical ? t("results.subcritical", "Subcritical") : t("results.mixed", "Mixed"),
      status: allSubcritical ? "success" : "info",
    },
    {
      label: t("results.summary.stations", "Stations"),
      value: result.stations.length.toString(),
      status: "neutral",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-4 text-green-500" />
        </div>
        <span className="text-sm font-medium">
          {t("results.summary.title", "Simulation Summary")}
        </span>
      </div>

      <div className="space-y-2">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30"
          >
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <span
              className={cn(
                "text-sm font-medium tabular-nums",
                stat.status === "success" && "text-green-500",
                stat.status === "warning" && "text-amber-500",
                stat.status === "info" && "text-blue-500"
              )}
            >
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResultsView({ className }: ResultsViewProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table")
  const [result] = useState<SimulationResult>(mockResults)

  const handleExport = (format: "xlsx" | "csv" | "pdf") => {
    // TODO: Implement export via Tauri
    console.log(`Exporting as ${format}`)
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <HugeiconsIcon icon={TableIcon} className="size-5 text-primary" />
          </div>
          <div>
            <h1>{t("results.title", "Results")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("results.subtitle", "Simulation output data")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Result Selector */}
          <Select defaultValue={result.id}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={result.id}>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={File01Icon} className="size-4" />
                  {result.name}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="outline" className="text-xs">
            {result.runAt.toLocaleString()}
          </Badge>

          <Button type="button" variant="ghost" size="sm" className="gap-2">
            <HugeiconsIcon icon={RefreshIcon} className="size-4" />
            {t("results.refresh", "Refresh")}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="default" size="sm" className="gap-2">
                <HugeiconsIcon icon={FileExportIcon} className="size-4" />
                {t("results.export", "Export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                <HugeiconsIcon icon={Download01Icon} className="size-4 mr-2" />
                {t("results.exportExcel", "Export to Excel (.xlsx)")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <HugeiconsIcon icon={Download01Icon} className="size-4 mr-2" />
                {t("results.exportCsv", "Export to CSV")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <HugeiconsIcon icon={Download01Icon} className="size-4 mr-2" />
                {t("results.exportPdf", "Export to PDF")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "table" | "chart")}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-6 pt-3 border-b">
          <TabsList className="h-9 p-1 bg-muted/20 dark:bg-muted/40 rounded-full">
            <TabsTrigger value="table" className="rounded-full text-xs gap-1.5 px-4">
              <HugeiconsIcon icon={TableIcon} className="size-3.5" />
              {t("results.tabs.table", "Table")}
            </TabsTrigger>
            <TabsTrigger value="chart" className="rounded-full text-xs gap-1.5 px-4">
              <HugeiconsIcon icon={ChartLineData02Icon} className="size-3.5" />
              {t("results.tabs.chart", "Charts")}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Main Content */}
            <ResizablePanel defaultSize={70} minSize={50}>
              <TabsContent value="table" className="h-full m-0">
                <ResultsSpreadsheet result={result} />
              </TabsContent>
              <TabsContent value="chart" className="h-full m-0">
                <ProfileChart />
              </TabsContent>
            </ResizablePanel>

            <ResizableHandle className="w-px bg-transparent hover:bg-border/50 transition-colors" />

            {/* Summary Panel */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
              <div className="h-full border-l overflow-auto">
                <SummaryPanel result={result} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </Tabs>
    </div>
  )
}
