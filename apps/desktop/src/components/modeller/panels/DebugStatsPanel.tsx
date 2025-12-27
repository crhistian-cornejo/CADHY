/**
 * Debug Stats Panel
 *
 * Real-time performance metrics and diagnostics
 */

import { Label, Separator } from "@cadhy/ui"
import { useEffect, useState } from "react"
import { instancingManager } from "@/services/instancing-manager"
import { lodManager } from "@/services/lod-manager"
import { textureCache } from "@/services/texture-cache"
import { getRenderer } from "@/services/viewport-registry"
import { useObjects } from "@/stores/modeller"

interface PerformanceStats {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  points: number
  lines: number
  geometries: number
  textures: number
}

export function DebugStatsPanel() {
  const objects = useObjects()

  const [perfStats, setPerfStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    geometries: 0,
    textures: 0,
  })

  const [lodStats, setLodStats] = useState(lodManager.getStats())
  const [instancingStats, setInstancingStats] = useState(instancingManager.getStats())
  const [textureCacheStats, setTextureCacheStats] = useState(textureCache.getStats())

  // Track FPS
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const updateStats = () => {
      const currentTime = performance.now()
      frameCount++

      // Update every second
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        const frameTime = (currentTime - lastTime) / frameCount

        // Get renderer from registry (may be null if not yet initialized)
        const gl = getRenderer()

        if (gl) {
          const info = gl.info

          setPerfStats({
            fps,
            frameTime: Number(frameTime.toFixed(2)),
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            points: info.render.points,
            lines: info.render.lines,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
          })
        } else {
          // No renderer yet, just update FPS
          setPerfStats((prev) => ({
            ...prev,
            fps,
            frameTime: Number(frameTime.toFixed(2)),
          }))
        }

        // Update optimization stats
        setLodStats(lodManager.getStats())
        setInstancingStats(instancingManager.getStats())
        setTextureCacheStats(textureCache.getStats())

        frameCount = 0
        lastTime = currentTime
      }

      animationId = requestAnimationFrame(updateStats)
    }

    animationId = requestAnimationFrame(updateStats)

    return () => cancelAnimationFrame(animationId)
  }, [])

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return "text-green-500"
    if (fps >= 30) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Performance Stats</h3>
        <p className="text-xs text-muted-foreground">
          Real-time rendering and optimization metrics
        </p>
      </div>

      <Separator />

      {/* Frame Rate */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Frame Rate</Label>
        <div className="rounded-2xl bg-muted/30 p-3 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">FPS:</span>
            <span className={`text-2xl font-mono font-bold ${getFpsColor(perfStats.fps)}`}>
              {perfStats.fps}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Frame Time:</span>
            <span className="font-mono">{perfStats.frameTime}ms</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Render Stats */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Renderer</Label>
        <div className="rounded-2xl bg-muted/30 p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Draw Calls:</span>
            <span className="font-mono">{perfStats.drawCalls}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Triangles:</span>
            <span className="font-mono">{perfStats.triangles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Geometries:</span>
            <span className="font-mono">{perfStats.geometries}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Textures:</span>
            <span className="font-mono">{perfStats.textures}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Scene Stats */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Scene</Label>
        <div className="rounded-2xl bg-muted/30 p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Objects:</span>
            <span className="font-mono">{objects.length}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Visible Objects:</span>
            <span className="font-mono">{objects.filter((obj) => obj.visible).length}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* LOD Stats */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Level of Detail</Label>
        <div className="rounded-2xl bg-muted/30 p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cached Objects:</span>
            <span className="font-mono">{lodStats.cachedObjects}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">LOD Variants:</span>
            <span className="font-mono">{lodStats.totalLODVariants}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Memory:</span>
            <span className="font-mono">{lodStats.memoryEstimate}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Instancing Stats */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Geometry Instancing</Label>
        <div className="rounded-2xl bg-muted/30 p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Instanced Meshes:</span>
            <span className="font-mono">{instancingStats.instancedMeshCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Instances:</span>
            <span className="font-mono">{instancingStats.totalInstances}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Memory Saved:</span>
            <span className="font-mono text-green-500">{instancingStats.memorySaved}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Texture Cache Stats */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Texture Cache</Label>
        <div className="rounded-2xl bg-muted/30 p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cache Size:</span>
            <span className="font-mono">{textureCacheStats.cacheSize}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Textures Loaded:</span>
            <span className="font-mono">{textureCacheStats.textureCount}</span>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      {perfStats.fps < 30 && (
        <>
          <Separator />
          <div className="rounded-2xl bg-status-warning-bg border border-status-warning-border p-3">
            <p className="text-xs text-status-warning font-medium mb-1">⚠ Low FPS Detected</p>
            <p className="text-xs text-muted-foreground">
              Consider enabling LOD or reducing scene complexity
            </p>
          </div>
        </>
      )}

      {perfStats.drawCalls > 100 && (
        <>
          <Separator />
          <div className="rounded-2xl bg-status-detecting-bg border border-status-detecting-border p-3">
            <p className="text-xs text-status-detecting font-medium mb-1">⚠ High Draw Calls</p>
            <p className="text-xs text-muted-foreground">
              Consider using geometry instancing for repeated objects
            </p>
          </div>
        </>
      )}

      {perfStats.fps >= 55 && perfStats.drawCalls < 50 && (
        <>
          <Separator />
          <div className="rounded-2xl bg-status-success-bg border border-status-success-border p-3">
            <p className="text-xs text-status-success">✓ Excellent performance</p>
          </div>
        </>
      )}
    </div>
  )
}
