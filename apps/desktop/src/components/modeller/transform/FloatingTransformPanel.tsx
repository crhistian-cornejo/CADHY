/**
 * Floating Transform Panel - CADHY
 *
 * A Plasticity-inspired floating panel for object transformations.
 * Appears automatically when an object is selected.
 */

import { cn } from "@cadhy/ui"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  InformationCircleIcon,
  Move01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, motion } from "motion/react"
import { useCallback, useState } from "react"
import { type AnySceneObject, useModellerStore, useSelectedObjects } from "@/stores/modeller"
import { type Vector3, VectorInput } from "../properties/shared/VectorInput"

export function FloatingTransformPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const selectedObjects = useSelectedObjects()
  const updateObject = useModellerStore((s) => s.updateObject)

  const selectedObject = selectedObjects.length === 1 ? selectedObjects[0] : null
  const isOpen = !!selectedObject

  const handleUpdate = useCallback(
    (updates: Partial<AnySceneObject>) => {
      if (selectedObject) {
        updateObject(selectedObject.id, updates)
      }
    },
    [selectedObject, updateObject]
  )

  const handlePositionChange = useCallback(
    (position: Vector3) => {
      if (selectedObject) {
        handleUpdate({ transform: { ...selectedObject.transform, position } })
      }
    },
    [selectedObject, handleUpdate]
  )

  const handleRotationChange = useCallback(
    (rotation: Vector3) => {
      if (selectedObject) {
        handleUpdate({ transform: { ...selectedObject.transform, rotation } })
      }
    },
    [selectedObject, handleUpdate]
  )

  const handleScaleChange = useCallback(
    (scale: Vector3) => {
      if (selectedObject) {
        handleUpdate({ transform: { ...selectedObject.transform, scale } })
      }
    },
    [selectedObject, handleUpdate]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-3 left-3 w-[280px] rounded-lg bg-background/95 backdrop-blur-md border border-border/40 shadow-2xl pointer-events-auto z-50 overflow-hidden"
        >
          {/* Header - Ultra Compact */}
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 bg-muted/10 cursor-pointer select-none outline-none focus-visible:bg-muted/20 transition-colors",
              !isCollapsed && "border-b border-border/30"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setIsCollapsed(!isCollapsed)
              }
            }}
          >
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Move01Icon} className="size-3 text-primary/80" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                TRANSFORMAR
              </span>
            </div>
            <div className="flex items-center gap-1">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                className="size-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              />
              <HugeiconsIcon
                icon={isCollapsed ? ArrowRight01Icon : ArrowDown01Icon}
                className="size-3.5 text-muted-foreground/60 transition-transform"
              />
            </div>
          </button>

          {/* Content - High Density */}
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-2.5 space-y-2.5">
                  {/* Position */}
                  <div className="grid grid-cols-[54px_1fr] items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter text-right pr-1">
                      POSICIÓN
                    </span>
                    <VectorInput
                      value={selectedObject.transform.position}
                      onChange={handlePositionChange}
                      step={0.1}
                    />
                  </div>

                  {/* Rotation */}
                  <div className="grid grid-cols-[54px_1fr] items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter text-right pr-1">
                      ROTACIÓN
                    </span>
                    <VectorInput
                      value={selectedObject.transform.rotation}
                      onChange={handleRotationChange}
                      step={1}
                    />
                  </div>

                  {/* Scale */}
                  <div className="grid grid-cols-[54px_1fr] items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter text-right pr-1">
                      ESCALA
                    </span>
                    <VectorInput
                      value={selectedObject.transform.scale}
                      onChange={handleScaleChange}
                      step={0.1}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FloatingTransformPanel
