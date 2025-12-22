/**
 * Floating Create Panel - CADHY
 *
 * A Plasticity-inspired floating panel for object creation.
 * Shows organized categories of primitives, hydraulic elements, and sketching tools.
 */

import { cn, toast } from "@cadhy/ui"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  CircleIcon,
  CubeIcon,
  Cylinder01Icon,
  SolidLine02Icon,
  TriangleIcon,
  WaterEnergyIcon,
  WaterfallDown01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useCAD } from "@/hooks/use-cad"
import { useModellerStore } from "@/stores/modeller"
import { getExecuteBoxCommand } from "../viewport/CommandContextBridge"

// ============================================================================
// TYPES
// ============================================================================

interface FloatingCreatePanelProps {
  isOpen: boolean
  onClose: () => void
}

type PrimitiveType = "box" | "cylinder" | "sphere" | "cone" | "torus" | "wedge" | "helix"
type HydraulicType = "channel" | "transition" | "chute"
type SketchType = "line" | "circle"

interface CreateItem {
  id: string
  icon: typeof CubeIcon
  label: string
  shortcut?: string
  color?: string
  onClick: () => void
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FloatingCreatePanel({ isOpen, onClose }: FloatingCreatePanelProps) {
  const { t } = useTranslation()
  const [_isCollapsed, _setIsCollapsed] = useState(false)
  const [_activeCategory, _setActiveCategory] = useState<string | null>(null)
  const cad = useCAD()
  const { openChuteCreator, openTransitionCreator } = useModellerStore()

  // ============================================================================
  // CREATION HANDLERS
  // ============================================================================

  const createPrimitive = useCallback(
    async (type: PrimitiveType) => {
      console.log("🎯 [CreatePanel] Click detected for primitive:", type)
      console.log("🎯 [CreatePanel] CAD object:", cad)
      try {
        const name = `${type.charAt(0).toUpperCase() + type.slice(1)} 1`
        console.log("🎯 [CreatePanel] Creating:", name)

        switch (type) {
          case "box": {
            // Use interactive command instead of direct creation
            const executeBox = getExecuteBoxCommand()
            if (executeBox) {
              console.log("🎯 [CreatePanel] Starting interactive box command...")
              onClose() // Close create panel before starting command
              const shapeId = await executeBox()
              if (shapeId) {
                toast.success(`${name} created`)
              }
            } else {
              console.warn(
                "🎯 [CreatePanel] Box command not available, falling back to direct creation"
              )
              await cad.createBoxShape({ width: 1, depth: 1, height: 1, name })
              toast.success(`${name} created`)
            }
            break
          }
          case "cylinder":
            await cad.createCylinderShape({ radius: 0.5, height: 1, name })
            break
          case "sphere":
            await cad.createSphereShape({ radius: 0.5, name })
            break
          case "cone":
            await cad.createConeShape({ baseRadius: 0.5, topRadius: 0, height: 1, name })
            break
          case "torus":
            await cad.createTorusShape({ majorRadius: 1, minorRadius: 0.3, name })
            break
          case "wedge":
          case "helix":
            toast.info(`${type} creation coming soon!`)
            break
          default:
            toast.error(`Unknown primitive type: ${type}`)
        }

        toast.success(`${name} created`)
        // Don't close panel automatically - let user create multiple objects
      } catch (error) {
        console.error("Failed to create primitive:", error)
        toast.error(
          `Failed to create ${type}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    [cad, onClose]
  )

  const createHydraulic = useCallback(
    (type: HydraulicType) => {
      console.log("🌊 [CreatePanel] Click detected for hydraulic:", type)
      console.log("🌊 [CreatePanel] openChuteCreator:", openChuteCreator)
      console.log("🌊 [CreatePanel] openTransitionCreator:", openTransitionCreator)
      switch (type) {
        case "channel":
          toast.info("Channel creation coming soon!")
          break
        case "transition":
          openTransitionCreator()
          onClose()
          break
        case "chute":
          openChuteCreator()
          onClose()
          break
        default:
          toast.error(`Unknown hydraulic type: ${type}`)
      }
    },
    [openChuteCreator, openTransitionCreator, onClose]
  )

  const createSketch = useCallback(
    async (type: SketchType) => {
      try {
        switch (type) {
          case "line":
            // Create a simple line in XY plane
            await cad.createLineShape({
              x1: -5,
              y1: 0,
              z1: 0,
              x2: 5,
              y2: 0,
              z2: 0,
              name: "Line 1",
            })
            toast.success("Line created! Select it to move/edit")
            break
          case "circle":
            // Create a circle in XY plane
            await cad.createCircleShape({
              cx: 0,
              cy: 0,
              radius: 5,
              name: "Circle 1",
            })
            toast.success("Circle created! Select it to move/edit")
            break
          default:
            toast.error(`Unknown sketch type: ${type}`)
        }
      } catch (error) {
        console.error("Failed to create sketch:", error)
        toast.error(
          `Failed to create ${type}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    [cad]
  )

  // ============================================================================
  // CATEGORY DEFINITIONS
  // ============================================================================

  const essentials: CreateItem[] = [
    {
      id: "box",
      icon: CubeIcon,
      label: "Box",
      shortcut: "B",
      onClick: () => createPrimitive("box"),
    },
    {
      id: "cylinder",
      icon: Cylinder01Icon,
      label: "Cylinder",
      shortcut: "Y",
      onClick: () => createPrimitive("cylinder"),
    },
    {
      id: "sphere",
      icon: CircleIcon,
      label: "Sphere",
      shortcut: "P",
      onClick: () => createPrimitive("sphere"),
    },
  ]

  const primitives: CreateItem[] = [
    {
      id: "cone",
      icon: TriangleIcon,
      label: "Cone",
      shortcut: "O",
      onClick: () => createPrimitive("cone"),
    },
    {
      id: "torus",
      icon: CircleIcon,
      label: "Torus",
      shortcut: "T",
      onClick: () => createPrimitive("torus"),
    },
    {
      id: "wedge",
      icon: TriangleIcon,
      label: "Wedge",
      shortcut: "W",
      onClick: () => createPrimitive("wedge"),
    },
    {
      id: "helix",
      icon: CircleIcon,
      label: "Helix",
      shortcut: "H",
      onClick: () => createPrimitive("helix"),
    },
  ]

  const hydraulics: CreateItem[] = [
    {
      id: "channel",
      icon: WaterEnergyIcon,
      label: "Channel",
      shortcut: "C",
      color: "text-cyan-500",
      onClick: () => createHydraulic("channel"),
    },
    {
      id: "transition",
      icon: WaterfallDown01Icon,
      label: "Transition",
      shortcut: "T",
      color: "text-green-500",
      onClick: () => createHydraulic("transition"),
    },
    {
      id: "chute",
      icon: ArrowDown01Icon,
      label: "Chute",
      shortcut: "R",
      color: "text-amber-500",
      onClick: () => createHydraulic("chute"),
    },
  ]

  const sketching: CreateItem[] = [
    {
      id: "line",
      icon: SolidLine02Icon,
      label: "Line",
      shortcut: "L",
      onClick: () => createSketch("line"),
    },
    {
      id: "circle",
      icon: CircleIcon,
      label: "Circle",
      shortcut: "I",
      onClick: () => createSketch("circle"),
    },
  ]

  // ============================================================================
  // CATEGORY SECTION COMPONENT
  // ============================================================================

  interface CategorySectionProps {
    title: string
    items: CreateItem[]
    defaultExpanded?: boolean
  }

  function CategorySection({ title, items, defaultExpanded = false }: CategorySectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    return (
      <div className="border-b border-border/20 last:border-b-0">
        <button
          type="button"
          className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/10 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {title}
          </span>
          <HugeiconsIcon
            icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
            className="size-3 text-muted-foreground/40"
          />
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-1.5 pb-1.5 grid grid-cols-2 gap-1">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-md",
                      "hover:bg-muted/50 transition-all",
                      "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
                      "text-left group"
                    )}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      className={cn("size-3.5", item.color || "text-muted-foreground/60")}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-medium text-foreground/90 block truncate">
                        {item.label}
                      </span>
                    </div>
                    {item.shortcut && (
                      <kbd className="text-[8px] px-1 py-0.5 rounded bg-muted/30 text-muted-foreground/50 font-mono">
                        {item.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-3 left-3 w-[300px] rounded-lg bg-background/95 backdrop-blur-md border border-border/40 shadow-2xl pointer-events-auto z-50 overflow-hidden"
        >
          {/* Header */}
          <div
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/10 border-b border-border/30"
            )}
          >
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Add01Icon} className="size-3 text-primary/80" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                CREAR OBJETO
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onClose}
                className="p-0.5 rounded hover:bg-muted/30 transition-colors"
              >
                <span className="text-[10px] text-muted-foreground/60">ESC</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[500px] overflow-y-auto">
            <CategorySection title="ESSENTIALS" items={essentials} defaultExpanded={true} />
            <CategorySection title="PRIMITIVES" items={primitives} defaultExpanded={true} />
            <CategorySection title="HYDRAULICS" items={hydraulics} defaultExpanded={false} />
            <CategorySection title="SKETCHING" items={sketching} defaultExpanded={false} />
          </div>

          {/* Footer Hint */}
          <div className="px-2.5 py-1.5 bg-muted/5 border-t border-border/20">
            <p className="text-[8px] text-muted-foreground/50 text-center">
              Click to create • ESC to close
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FloatingCreatePanel
