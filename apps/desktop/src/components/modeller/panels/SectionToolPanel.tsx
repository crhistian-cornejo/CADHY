/**
 * Section Tool Panel
 *
 * Control clipping planes to view model interiors
 */

import { Button, Label, Separator, Slider, Switch } from "@cadhy/ui"
import { useEffect, useState } from "react"
import {
  type SectionOrientation,
  type SectionPlaneConfig,
  sectionTool,
} from "@/services/section-tool"
import { getScene } from "@/services/viewport-registry"

interface ActiveSection {
  id: string
  config: SectionPlaneConfig
}

export function SectionToolPanel() {
  const [sections, setSections] = useState<ActiveSection[]>([])
  const [globalEnabled, setGlobalEnabled] = useState(true)

  // Initialize section tool with scene from registry
  useEffect(() => {
    const scene = getScene()
    if (scene) {
      sectionTool.init(scene)
    }
  }, [])

  const addSection = (orientation: SectionOrientation) => {
    const id = `section-${Date.now()}`
    const config: SectionPlaneConfig = {
      orientation,
      position: 0,
      enabled: true,
      showHelper: true,
    }

    sectionTool.createSection(id, config)
    setSections((prev) => [...prev, { id, config }])
  }

  const updateSection = (id: string, updates: Partial<SectionPlaneConfig>) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === id) {
          const newConfig = { ...section.config, ...updates }
          sectionTool.createSection(id, newConfig)
          return { id, config: newConfig }
        }
        return section
      })
    )
  }

  const removeSection = (id: string) => {
    sectionTool.removeSection(id)
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  const clearAll = () => {
    sectionTool.clearAll()
    setSections([])
  }

  const handleGlobalToggle = (enabled: boolean) => {
    setGlobalEnabled(enabled)
    sectionTool.setEnabled(enabled)
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Section Tool</h3>
        <p className="text-xs text-muted-foreground">Cut through models to view interiors</p>
      </div>

      <Separator />

      {/* Global Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Enable Clipping</Label>
          <p className="text-xs text-muted-foreground">Show/hide all section planes</p>
        </div>
        <Switch checked={globalEnabled} onCheckedChange={handleGlobalToggle} />
      </div>

      <Separator />

      {/* Add Section Buttons */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Add Section Plane</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => addSection("xy")} className="text-xs">
            XY
          </Button>
          <Button variant="outline" size="sm" onClick={() => addSection("xz")} className="text-xs">
            XZ
          </Button>
          <Button variant="outline" size="sm" onClick={() => addSection("yz")} className="text-xs">
            YZ
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          XY = Horizontal, XZ = Vertical (flow), YZ = Vertical (cross)
        </p>
      </div>

      <Separator />

      {/* Active Sections List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Active Sections ({sections.length})</Label>
          {sections.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-6">
              Remove All
            </Button>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">No section planes active</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sections.map((section) => (
              <div key={section.id} className="rounded-2xl border bg-card p-3 space-y-3">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase">
                      {section.config.orientation} Plane
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Position: {section.config.position.toFixed(2)} m
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                    className="h-6 text-xs"
                  >
                    Remove
                  </Button>
                </div>

                {/* Position Slider */}
                <div className="space-y-1">
                  <Slider
                    value={[section.config.position]}
                    onValueChange={(value) => updateSection(section.id, { position: value[0] })}
                    min={-20}
                    max={20}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Section Controls */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={section.config.enabled}
                      onCheckedChange={(enabled) => updateSection(section.id, { enabled })}
                      className="scale-75"
                    />
                    <span className="text-xs">Enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={section.config.showHelper}
                      onCheckedChange={(showHelper) => updateSection(section.id, { showHelper })}
                      className="scale-75"
                    />
                    <span className="text-xs">Helper</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Tips */}
      {sections.length > 0 && (
        <>
          <Separator />
          <div className="rounded-2xl bg-status-info-bg border border-status-info-border p-3">
            <p className="text-xs text-status-info">
              💡 Tip: Drag sliders to move section planes and reveal interior details
            </p>
          </div>
        </>
      )}

      {/* Quick Examples */}
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-medium">Quick Examples</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              clearAll()
              addSection("xz")
            }}
            className="rounded-2xl border bg-card p-2 text-xs hover:bg-accent/50 transition-colors text-left"
          >
            <p className="font-medium">Longitudinal</p>
            <p className="text-muted-foreground">View flow direction</p>
          </button>
          <button
            type="button"
            onClick={() => {
              clearAll()
              addSection("yz")
            }}
            className="rounded-2xl border bg-card p-2 text-xs hover:bg-accent/50 transition-colors text-left"
          >
            <p className="font-medium">Cross Section</p>
            <p className="text-muted-foreground">View channel profile</p>
          </button>
        </div>
      </div>
    </div>
  )
}
