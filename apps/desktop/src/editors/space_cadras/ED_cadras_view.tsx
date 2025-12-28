/**
 * CADRas View - CADHY
 *
 * 1D/2D Hydraulic simulation runner (like HEC-RAS)
 * Features:
 * - Model tree (1D/2D plans)
 * - Mesh preview with boundary conditions
 * - Solver configuration
 * - Run simulations
 */

import {
  Badge,
  Button,
  cn,
  Input,
  Progress,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@cadhy/ui"
import {
  Add01Icon,
  ArrowRight01Icon,
  ChartLineData02Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Folder01Icon,
  GridIcon,
  PauseIcon,
  PlayIcon,
  Settings02Icon,
  StopIcon,
  WaveIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { motion } from "motion/react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

// ============================================================================
// TYPES
// ============================================================================

interface CadrasViewProps {
  className?: string
}

type SimulationType = "steady" | "unsteady"
type SimulationStatus = "idle" | "running" | "completed" | "error"

interface SimulationPlan {
  id: string
  name: string
  type: SimulationType
  status: SimulationStatus
  progress?: number
  lastRun?: Date
}

// ============================================================================
// MODEL TREE COMPONENT
// ============================================================================

function ModelTree({
  plans,
  selectedPlan,
  onSelectPlan,
  onAddPlan,
}: {
  plans: SimulationPlan[]
  selectedPlan: string | null
  onSelectPlan: (id: string) => void
  onAddPlan: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("cadras.modelTree", "Model Plans")}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onAddPlan}>
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("cadras.newPlan", "New Plan")}</TooltipContent>
        </Tooltip>
      </div>

      {/* Plan List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {plans.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="mx-auto mb-4 rounded-2xl bg-muted/50 p-4 w-fit">
                <HugeiconsIcon icon={Folder01Icon} className="size-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("cadras.noPlans", "No simulation plans")}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t("cadras.createFirst", "Create your first plan")}
              </p>
            </motion.div>
          ) : (
            plans.map((plan, index) => (
              <motion.button
                key={plan.id}
                type="button"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectPlan(plan.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                  selectedPlan === plan.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <div
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center",
                    plan.type === "steady" ? "bg-blue-500/10" : "bg-purple-500/10"
                  )}
                >
                  <HugeiconsIcon
                    icon={plan.type === "steady" ? ChartLineData02Icon : WaveIcon}
                    className={cn(
                      "size-4",
                      plan.type === "steady" ? "text-blue-500" : "text-purple-500"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.type === "steady" ? "Steady Flow" : "Unsteady Flow"}
                  </p>
                </div>
                {plan.status === "completed" && (
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-4 text-green-500" />
                )}
                {plan.status === "running" && (
                  <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                )}
              </motion.button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ============================================================================
// SIMULATION CONFIG PANEL
// ============================================================================

function SimulationConfig({ plan }: { plan: SimulationPlan | null }) {
  const { t } = useTranslation()

  if (!plan) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-full"
      >
        <div className="text-center py-12">
          <div className="mx-auto mb-4 rounded-2xl bg-muted/50 p-4 w-fit">
            <HugeiconsIcon icon={Settings02Icon} className="size-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("cadras.selectPlan", "Select a plan to configure")}
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-6"
      >
        {/* Plan Type */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("cadras.simulationType", "Simulation Type")}
          </span>
          <Select defaultValue={plan.type}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="steady">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={ChartLineData02Icon} className="size-4 text-blue-500" />
                  <span>{t("cadras.steadyFlow", "Steady Flow (1D)")}</span>
                </div>
              </SelectItem>
              <SelectItem value="unsteady">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={WaveIcon} className="size-4 text-purple-500" />
                  <span>{t("cadras.unsteadyFlow", "Unsteady Flow (1D)")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Geometry */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("cadras.geometry", "Geometry Source")}
          </span>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <HugeiconsIcon icon={GridIcon} className="size-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t("cadras.fromMesh", "From Mesh")}</p>
              <p className="text-xs text-muted-foreground">
                {t("cadras.geometryDesc", "Cross-sections from current mesh")}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {t("cadras.linked", "Linked")}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Flow Data */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("cadras.flowData", "Flow Data")}
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">
                {t("cadras.discharge", "Discharge Q")}
              </span>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue={5.0} className="h-9 text-sm" />
                <span className="text-xs text-muted-foreground shrink-0">m³/s</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">
                {t("cadras.manningN", "Manning n")}
              </span>
              <Input type="number" defaultValue={0.015} step={0.001} className="h-9 text-sm" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Boundary Conditions */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("cadras.boundaryConditions", "Boundary Conditions")}
          </span>

          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
              <span className="text-xs font-medium w-20 text-muted-foreground">
                {t("cadras.upstream", "Upstream")}
              </span>
              <Select defaultValue="flowHydrograph">
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flowHydrograph">
                    {t("cadras.bcFlowHydrograph", "Flow Hydrograph")}
                  </SelectItem>
                  <SelectItem value="normalDepth">
                    {t("cadras.bcNormalDepth", "Normal Depth")}
                  </SelectItem>
                  <SelectItem value="criticalDepth">
                    {t("cadras.bcCriticalDepth", "Critical Depth")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
              <span className="text-xs font-medium w-20 text-muted-foreground">
                {t("cadras.downstream", "Downstream")}
              </span>
              <Select defaultValue="normalDepth">
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normalDepth">
                    {t("cadras.bcNormalDepth", "Normal Depth")}
                  </SelectItem>
                  <SelectItem value="criticalDepth">
                    {t("cadras.bcCriticalDepth", "Critical Depth")}
                  </SelectItem>
                  <SelectItem value="stageHydrograph">
                    {t("cadras.bcStageHydrograph", "Stage Hydrograph")}
                  </SelectItem>
                  <SelectItem value="ratingCurve">
                    {t("cadras.bcRatingCurve", "Rating Curve")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {plan.type === "unsteady" && (
          <>
            <Separator />

            {/* Time Settings */}
            <div className="space-y-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("cadras.timeSettings", "Time Settings")}
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">
                    {t("cadras.duration", "Duration")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={24} className="h-9 text-sm" />
                    <span className="text-xs text-muted-foreground shrink-0">hr</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">
                    {t("cadras.timeStep", "Time Step")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={60} className="h-9 text-sm" />
                    <span className="text-xs text-muted-foreground shrink-0">s</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </ScrollArea>
  )
}

// ============================================================================
// MESH PREVIEW PANEL
// ============================================================================

function MeshPreview() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col h-full">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("cadras.meshPreview", "Mesh Preview")}
        </span>
        <Badge variant="outline" className="text-xs">
          1D
        </Badge>
      </div>

      {/* Preview Canvas Placeholder */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center bg-muted/10"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 rounded-2xl bg-muted/50 p-5 w-fit">
            <HugeiconsIcon icon={GridIcon} className="size-10 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {t("cadras.meshPreviewPlaceholder", "Mesh Preview")}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-[250px]">
            {t(
              "cadras.meshPreviewDesc",
              "Cross-section view with boundary conditions will appear here"
            )}
          </p>
        </div>
      </motion.div>

      {/* Cross-section list */}
      <div className="border-t bg-muted/30">
        <div className="px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t("cadras.crossSections", "Cross Sections")} (12)
          </span>
        </div>
        <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
          {["0+000", "0+050", "0+100", "0+150", "0+200", "0+250"].map((sta) => (
            <Badge key={sta} variant="secondary" className="text-xs font-mono">
              {sta}
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            +6 more
          </Badge>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// RUN CONTROLS
// ============================================================================

function RunControls({
  plan,
  onRun,
  onStop,
}: {
  plan: SimulationPlan | null
  onRun: () => void
  onStop: () => void
}) {
  const { t } = useTranslation()

  if (!plan) return null

  return (
    <div className="border-t bg-muted/30 p-4">
      {plan.status === "running" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-sm font-medium">
                {t("cadras.running", "Running simulation...")}
              </span>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums font-medium">
              {plan.progress ?? 0}%
            </span>
          </div>
          <Progress value={plan.progress ?? 0} className="h-2" />
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onStop}>
              <HugeiconsIcon icon={StopIcon} className="size-4" />
              {t("cadras.stop", "Stop")}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-2">
              <HugeiconsIcon icon={PauseIcon} className="size-4" />
              {t("cadras.pause", "Pause")}
            </Button>
          </div>
        </motion.div>
      ) : plan.status === "completed" ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">{t("cadras.completed", "Simulation completed")}</p>
              {plan.lastRun && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <HugeiconsIcon icon={Clock01Icon} className="size-3" />
                  {plan.lastRun.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRun}>
              <HugeiconsIcon icon={PlayIcon} className="size-4" />
              {t("cadras.rerun", "Re-run")}
            </Button>
            <Button type="button" variant="default" size="sm" className="gap-2">
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              {t("cadras.viewResults", "View Results")}
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("cadras.readyToRun", "Ready to run simulation")}
          </p>
          <Button type="button" variant="default" size="sm" className="gap-2" onClick={onRun}>
            <HugeiconsIcon icon={PlayIcon} className="size-4" />
            {t("cadras.runSimulation", "Run Simulation")}
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CadrasView({ className }: CadrasViewProps) {
  const { t } = useTranslation()
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>("plan-1")
  const [plans, setPlans] = useState<SimulationPlan[]>([
    {
      id: "plan-1",
      name: "Steady Flow - Design Q",
      type: "steady",
      status: "idle",
    },
    {
      id: "plan-2",
      name: "Flood Event - 100yr",
      type: "unsteady",
      status: "completed",
      lastRun: new Date(),
    },
  ])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null

  const handleAddPlan = () => {
    const newPlan: SimulationPlan = {
      id: `plan-${Date.now()}`,
      name: `New Plan ${plans.length + 1}`,
      type: "steady",
      status: "idle",
    }
    setPlans([...plans, newPlan])
    setSelectedPlanId(newPlan.id)
  }

  const handleRun = () => {
    if (!selectedPlanId) return
    setPlans((prev) =>
      prev.map((p) =>
        p.id === selectedPlanId ? { ...p, status: "running" as const, progress: 0 } : p
      )
    )

    // Simulate progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 5
      if (progress >= 100) {
        clearInterval(interval)
        setPlans((prev) =>
          prev.map((p) =>
            p.id === selectedPlanId
              ? { ...p, status: "completed" as const, progress: 100, lastRun: new Date() }
              : p
          )
        )
      } else {
        setPlans((prev) => prev.map((p) => (p.id === selectedPlanId ? { ...p, progress } : p)))
      }
    }, 200)
  }

  const handleStop = () => {
    if (!selectedPlanId) return
    setPlans((prev) =>
      prev.map((p) =>
        p.id === selectedPlanId ? { ...p, status: "idle" as const, progress: 0 } : p
      )
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <HugeiconsIcon icon={WaveIcon} className="size-5 text-primary" />
          </div>
          <div>
            <h1>{t("cadras.title", "CADRas")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("cadras.subtitle", "1D/2D Hydraulic Solver")}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {t("cadras.version", "v1.0")}
        </Badge>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Model Tree */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <ModelTree
            plans={plans}
            selectedPlan={selectedPlanId}
            onSelectPlan={setSelectedPlanId}
            onAddPlan={handleAddPlan}
          />
        </ResizablePanel>

        <ResizableHandle className="w-px bg-transparent hover:bg-border/50 transition-colors" />

        {/* Center: Mesh Preview */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex flex-col h-full">
            <MeshPreview />
            <RunControls plan={selectedPlan} onRun={handleRun} onStop={handleStop} />
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-px bg-transparent hover:bg-border/50 transition-colors" />

        {/* Right Panel: Configuration */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
          <div className="flex flex-col h-full border-l">
            <div className="px-4 py-3 border-b">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("cadras.configuration", "Configuration")}
              </span>
            </div>
            <SimulationConfig plan={selectedPlan} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
