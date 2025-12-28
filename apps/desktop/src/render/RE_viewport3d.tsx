/**
 * Viewport3D Component - CADHY
 *
 * Main 3D viewport with:
 * - GPU-accelerated rendering via Three.js
 * - Transform gizmos
 * - Selection handling
 * - Grid and axes
 * - Camera controls
 * - AI analyzing scene visual effect
 */

import { AIGlowBorder, cn } from "@cadhy/ui"
import { PerformanceMonitor as DreiPerformanceMonitor } from "@react-three/drei"
import { Canvas, type RootState } from "@react-three/fiber"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { registerViewportCanvas } from "@/core/services/thumbnail-service"
import { useIsAnalyzingScene } from "@/core/stores/chat-store"
import { useViewportSettings } from "@/core/stores/modeller"
import { PlaybackControls } from "@/editors/space_view3d/ED_view3d_playback"
import { useSounds } from "@/lib/hooks/use-sounds"
import { CommandProvider } from "@/windowmanager"
import { ActiveOperationRenderer } from "./RE_active_operation"
import { Label3DContainer } from "./RE_label3d"
import { MeshCacheStats } from "./RE_mesh_cache_stats"
import { ViewportOverlays } from "./RE_overlays"
import { PerformanceMonitor, PerformanceOverlay } from "./RE_performance_monitor"
import { SceneContent } from "./RE_scene_content"

export interface Viewport3DProps {
  className?: string
  showStats?: boolean
  showAnimationPanel?: boolean
  onToggleAnimationPanel?: () => void
}

// DPR range for adaptive quality scaling
const DPR_MIN = 0.5 // Minimum DPR when performance is poor
const DPR_MAX = 1.5 // Maximum DPR when performance is good
const DPR_DEFAULT = 1.0 // Default starting DPR

export function Viewport3D({
  className,
  showStats = false,
  showAnimationPanel = false,
}: Viewport3DProps) {
  const viewportSettings = useViewportSettings()
  const isAnalyzingScene = useIsAnalyzingScene()
  const { playAiThinking, playAiComplete } = useSounds()

  // PERFORMANCE: Adaptive DPR based on performance monitoring
  // drei's PerformanceMonitor calls onIncline when FPS is good, onDecline when poor
  const [adaptiveDpr, setAdaptiveDpr] = useState(DPR_DEFAULT)

  // Track previous analyzing state to play sounds on transitions
  const wasAnalyzingRef = useRef(false)

  // Register canvas for thumbnail capture and add context loss handlers
  const handleCreated = useCallback((state: RootState) => {
    registerViewportCanvas(state.gl.domElement)

    // Add WebGL context loss/restore handlers to prevent texture loss
    const canvas = state.gl.domElement
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      console.warn("[WebGL] Context lost - preventing default behavior")
    }

    const handleContextRestored = () => {
      // PERF: console.log("[WebGL] Context restored")
    }

    canvas.addEventListener("webglcontextlost", handleContextLost, false)
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false)

    // Return cleanup function (will be stored by R3F)
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost)
      canvas.removeEventListener("webglcontextrestored", handleContextRestored)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      registerViewportCanvas(null)
    }
  }, [])

  // Play sounds when analyzing state changes
  useEffect(() => {
    if (isAnalyzingScene && !wasAnalyzingRef.current) {
      // Started analyzing
      playAiThinking()
    } else if (!isAnalyzingScene && wasAnalyzingRef.current) {
      // Finished analyzing
      playAiComplete()
    }
    wasAnalyzingRef.current = isAnalyzingScene
  }, [isAnalyzingScene, playAiThinking, playAiComplete])

  return (
    <AIGlowBorder active={isAnalyzingScene} borderWidth={60} duration={3}>
      <div className={cn("relative h-full w-full p-2", className)}>
        {/* Viewport Container with subtle rounded-2xl corners */}
        <div className="relative h-full w-full rounded-2xl overflow-hidden ring-1 ring-border/30">
          <Canvas
            shadows="soft"
            dpr={
              viewportSettings.performanceMode
                ? (() => {
                    // In performance mode, use dprOverride if set, otherwise use 1 (native resolution)
                    const dprValue = viewportSettings.dprOverride ?? 1
                    const clampedDpr = Math.max(0.5, Math.min(2, dprValue))
                    return [clampedDpr, clampedDpr]
                  })()
                : // PERFORMANCE: Use adaptive DPR controlled by drei PerformanceMonitor
                  [DPR_MIN, adaptiveDpr]
            }
            frameloop="demand"
            gl={{
              antialias: viewportSettings.antialiasing,
              alpha: false,
              powerPreference: "high-performance",
              stencil: false,
              depth: true,
              preserveDrawingBuffer: true, // Required for thumbnail capture
              logarithmicDepthBuffer: false,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1,
            }}
            camera={{ position: [10, 10, 10], fov: 50 }}
            style={{ background: viewportSettings.backgroundColor }}
            onCreated={handleCreated}
          >
            <CommandProvider>
              {/* PERFORMANCE: drei PerformanceMonitor for adaptive quality scaling
                  - onIncline: Performance is good, increase quality (higher DPR)
                  - onDecline: Performance is poor, decrease quality (lower DPR)
                  - flipflops: Require multiple samples before triggering to avoid oscillation
                  - threshold: Performance factor difference to trigger (0.5 = 50%) */}
              <DreiPerformanceMonitor
                onIncline={() => setAdaptiveDpr(Math.min(DPR_MAX, adaptiveDpr + 0.25))}
                onDecline={() => setAdaptiveDpr(Math.max(DPR_MIN, adaptiveDpr - 0.25))}
                flipflops={3}
                threshold={0.5}
              />
              <Suspense fallback={null}>
                <SceneContent showStats={showStats} />
              </Suspense>
              {/* Performance Monitor - logs to console and tracks WebGL stats */}
              <PerformanceMonitor />
            </CommandProvider>
          </Canvas>

          {/* Performance Overlay - shows FPS and spike detection */}
          <PerformanceOverlay />

          {/* Floating toolbars and panels (Plasticity-style) */}
          <ViewportOverlays />

          {/* Mesh Cache Stats - Show when stats are enabled */}
          {showStats && <MeshCacheStats />}

          {/* Playback Controls - Only show when animation panel is open */}
          {showAnimationPanel && <PlaybackControls />}

          {/* Active Operation Dialog - Controlled by commands */}
          <ActiveOperationRenderer />

          {/* 3D Labels Container - For edge operation labels */}
          <Label3DContainer>
            {/* Labels are rendered here by InteractiveCADOperations */}
          </Label3DContainer>
        </div>
      </div>
    </AIGlowBorder>
  )
}

export default Viewport3D
