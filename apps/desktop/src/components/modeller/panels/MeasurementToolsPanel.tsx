/**
 * Measurement Tools Panel
 *
 * UI for distance, area, volume, and angle measurements
 */

import { Button, Label, Separator } from "@cadhy/ui"
import {
  CubeIcon,
  Delete01Icon,
  RulerIcon,
  SquareIcon,
  TriangleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect, useState } from "react"
import * as THREE from "three"
import { type MeasurementResult, measurementTools } from "@/services/measurement-tools"
import { getScene } from "@/services/viewport-registry"

type MeasurementMode = "distance" | "area" | "volume" | "angle" | "none"

export function MeasurementToolsPanel() {
  const [mode, setMode] = useState<MeasurementMode>("none")
  const [measurements, setMeasurements] = useState<MeasurementResult[]>([])
  const [selectedPoints, setSelectedPoints] = useState<THREE.Vector3[]>([])

  const handleModeChange = (newMode: MeasurementMode) => {
    setMode(newMode)
    setSelectedPoints([])
  }

  const handleMeasureDistance = () => {
    if (selectedPoints.length < 2) return

    const result = measurementTools.measureDistance(selectedPoints[0], selectedPoints[1])
    setMeasurements((prev) => [...prev, result])
    setSelectedPoints([])
    setMode("none")
  }

  const handleMeasureArea = () => {
    if (selectedPoints.length < 3) return

    const result = measurementTools.measureArea(selectedPoints)
    setMeasurements((prev) => [...prev, result])
    setSelectedPoints([])
    setMode("none")
  }

  const handleMeasureVolume = () => {
    // Calculate bounding box from points
    const bbox = new THREE.Box3()
    selectedPoints.forEach((p) => bbox.expandByPoint(p))

    const result = measurementTools.measureVolume(bbox.min, bbox.max)
    setMeasurements((prev) => [...prev, result])
    setSelectedPoints([])
    setMode("none")
  }

  const handleMeasureAngle = () => {
    if (selectedPoints.length < 3) return

    const result = measurementTools.measureAngle(
      selectedPoints[0],
      selectedPoints[1],
      selectedPoints[2]
    )
    setMeasurements((prev) => [...prev, result])
    setSelectedPoints([])
    setMode("none")
  }

  const handleClearAll = () => {
    measurementTools.clearAll()
    setMeasurements([])
    setSelectedPoints([])
    setMode("none")
  }

  const handleRemoveMeasurement = (index: number) => {
    const measurement = measurements[index]
    if (measurement.visual) {
      measurementTools.remove(measurement.visual)
    }
    setMeasurements((prev) => prev.filter((_, i) => i !== index))
  }

  // Add measurements group to scene when component mounts
  useEffect(() => {
    const scene = getScene()
    if (scene && !scene.getObjectByName("Measurements")) {
      scene.add(measurementTools.getMeasurementsGroup())
    }
  }, [])

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Measurement Tools</h3>
        <p className="text-xs text-muted-foreground">
          Measure distances, areas, volumes, and angles
        </p>
      </div>

      <Separator />

      {/* Tool Selection */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Select Tool</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={mode === "distance" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("distance")}
            className="text-xs"
          >
            <HugeiconsIcon icon={RulerIcon} className="w-3 h-3 mr-1" />
            Distance
          </Button>
          <Button
            variant={mode === "area" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("area")}
            className="text-xs"
          >
            <HugeiconsIcon icon={SquareIcon} className="w-3 h-3 mr-1" />
            Area
          </Button>
          <Button
            variant={mode === "volume" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("volume")}
            className="text-xs"
          >
            <HugeiconsIcon icon={CubeIcon} className="w-3 h-3 mr-1" />
            Volume
          </Button>
          <Button
            variant={mode === "angle" ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange("angle")}
            className="text-xs"
          >
            <HugeiconsIcon icon={TriangleIcon} className="w-3 h-3 mr-1" />
            Angle
          </Button>
        </div>
      </div>

      {/* Current Measurement Instructions */}
      {mode !== "none" && (
        <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3 space-y-2">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {mode === "distance" && "Click 2 points to measure distance"}
            {mode === "area" &&
              "Click 3+ points to measure area (click first point again to close)"}
            {mode === "volume" && "Click points to define bounding box"}
            {mode === "angle" && "Click 3 points (vertex in middle) to measure angle"}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Points selected: {selectedPoints.length}
            </span>
            <div className="flex gap-2">
              {((mode === "distance" && selectedPoints.length >= 2) ||
                (mode === "area" && selectedPoints.length >= 3) ||
                (mode === "volume" && selectedPoints.length >= 2) ||
                (mode === "angle" && selectedPoints.length >= 3)) && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (mode === "distance") handleMeasureDistance()
                    else if (mode === "area") handleMeasureArea()
                    else if (mode === "volume") handleMeasureVolume()
                    else if (mode === "angle") handleMeasureAngle()
                  }}
                  className="text-xs"
                >
                  Measure
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModeChange("none")}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Measurements List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Measurements ({measurements.length})</Label>
          {measurements.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs h-6">
              <HugeiconsIcon icon={Delete01Icon} className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {measurements.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">No measurements yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {measurements.map((measurement, index) => (
              <div
                key={index}
                className="rounded-2xl border bg-card p-2 flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-xs font-mono font-medium">
                    {measurement.value.toFixed(3)} {measurement.unit}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMeasurement(index)}
                  className="h-6 w-6 p-0"
                >
                  <HugeiconsIcon icon={Delete01Icon} className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="rounded-2xl bg-muted/30 p-3 space-y-1">
        <p className="text-xs font-medium">Tips:</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Click on objects to select measurement points</li>
          <li>Measurements are visible in 3D viewport</li>
          <li>All measurements are saved with the project</li>
        </ul>
      </div>
    </div>
  )
}
