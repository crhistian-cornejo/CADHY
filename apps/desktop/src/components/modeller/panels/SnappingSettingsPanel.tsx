/**
 * Snapping Settings Panel
 *
 * Configure smart snapping behavior
 */

import { Label, Separator, Slider, Switch } from "@cadhy/ui"
import { useState } from "react"
import { type SnapConfig, snapManager } from "@/services/snap-manager"

export function SnappingSettingsPanel() {
  const [config, setConfig] = useState<SnapConfig>(snapManager.getConfig())

  const handleConfigChange = (updates: Partial<SnapConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    snapManager.setConfig(newConfig)
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Snapping Settings</h3>
        <p className="text-xs text-muted-foreground">
          Configure intelligent snapping for precise modeling
        </p>
      </div>

      <Separator />

      {/* Master Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Enable Snapping</Label>
          <p className="text-xs text-muted-foreground">Master toggle for all snap features</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => handleConfigChange({ enabled })}
        />
      </div>

      {config.enabled && (
        <>
          <Separator />

          {/* Snap Distance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Snap Distance</Label>
              <span className="text-xs text-muted-foreground">{config.distance.toFixed(2)} m</span>
            </div>
            <Slider
              value={[config.distance]}
              onValueChange={(value) => handleConfigChange({ distance: value[0] })}
              min={0.1}
              max={2.0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Maximum distance to snap to targets</p>
          </div>

          <Separator />

          {/* Snap Types */}
          <div className="space-y-3">
            <Label className="text-xs font-medium">Snap To</Label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Vertices</Label>
                  <p className="text-xs text-muted-foreground">Snap to geometry vertices</p>
                </div>
                <Switch
                  checked={config.snapToVertices}
                  onCheckedChange={(snapToVertices) => handleConfigChange({ snapToVertices })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Edges</Label>
                  <p className="text-xs text-muted-foreground">Snap to edge midpoints</p>
                </div>
                <Switch
                  checked={config.snapToEdges}
                  onCheckedChange={(snapToEdges) => handleConfigChange({ snapToEdges })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Faces</Label>
                  <p className="text-xs text-muted-foreground">Snap to face centers</p>
                </div>
                <Switch
                  checked={config.snapToFaces}
                  onCheckedChange={(snapToFaces) => handleConfigChange({ snapToFaces })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Grid</Label>
                  <p className="text-xs text-muted-foreground">Snap to grid intersections</p>
                </div>
                <Switch
                  checked={config.snapToGrid}
                  onCheckedChange={(snapToGrid) => handleConfigChange({ snapToGrid })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Centers</Label>
                  <p className="text-xs text-muted-foreground">Snap to object centers</p>
                </div>
                <Switch
                  checked={config.snapToCenters}
                  onCheckedChange={(snapToCenters) => handleConfigChange({ snapToCenters })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Grid Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Grid Size</Label>
              <span className="text-xs text-muted-foreground">{config.gridSize.toFixed(2)} m</span>
            </div>
            <Slider
              value={[config.gridSize]}
              onValueChange={(value) => handleConfigChange({ gridSize: value[0] })}
              min={0.1}
              max={5.0}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Grid spacing for snap points</p>
          </div>

          <Separator />

          {/* Visual Indicator */}
          <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ Snapping enabled - Green sphere indicates snap points
            </p>
          </div>
        </>
      )}

      {/* Quick Presets */}
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-medium">Quick Presets</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              handleConfigChange({
                snapToVertices: true,
                snapToEdges: true,
                snapToFaces: false,
                snapToGrid: true,
                snapToCenters: true,
                distance: 0.5,
              })
            }
            className="rounded-md border bg-card p-2 text-xs hover:bg-accent/50 transition-colors"
          >
            Precision
          </button>
          <button
            type="button"
            onClick={() =>
              handleConfigChange({
                snapToVertices: false,
                snapToEdges: false,
                snapToFaces: false,
                snapToGrid: true,
                snapToCenters: false,
                distance: 1.0,
              })
            }
            className="rounded-md border bg-card p-2 text-xs hover:bg-accent/50 transition-colors"
          >
            Grid Only
          </button>
        </div>
      </div>
    </div>
  )
}
