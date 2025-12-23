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

import { AIGlowBorder, cn, Kbd } from "@cadhy/ui"
import { Cancel01Icon, Mouse01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Canvas, type RootState } from "@react-three/fiber"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { useSounds } from "@/hooks/use-sounds"
import { registerViewportCanvas } from "@/services/thumbnail-service"
import { useIsAnalyzingScene } from "@/stores/chat-store"
import { useBoxSelectMode, useViewportSettings } from "@/stores/modeller"
import { ActiveOperationRenderer } from "./ActiveOperationRenderer"
import { CommandProvider } from "./CommandProvider"
import { Label3DContainer } from "./Label3D"
import { MeshCacheStats } from "./MeshCacheStats"
import { PlaybackControls } from "./PlaybackControls"
import { SceneContent } from "./SceneContent"
import { SimpleSelectionBox } from "./SimpleSelectionBox"
import { ViewportOverlays } from "./ViewportOverlays"

export interface Viewport3DProps {
  className?: string
  showStats?: boolean
  showAnimationPanel?: boolean
  onToggleAnimationPanel?: () => void
}

export function Viewport3D({
  className,
  showStats = false,
  showAnimationPanel = false,
  onToggleAnimationPanel,
}: Viewport3DProps) {
  const viewportSettings = useViewportSettings()
  const isAnalyzingScene = useIsAnalyzingScene()
  const isBoxSelectMode = useBoxSelectMode()
  const { playAiThinking, playAiComplete } = useSounds()
  const [showBoxSelectHint, setShowBoxSelectHint] = useState(true)

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
      console.log("[WebGL] Context restored")
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
            dpr={[1, 1.5]}
            frameloop={viewportSettings.enablePostProcessing ? "demand" : "always"}
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
              <Suspense fallback={null}>
                <SceneContent showStats={showStats} />
              </Suspense>
            </CommandProvider>
          </Canvas>

          {/* Floating toolbars and panels (Plasticity-style) */}
          <ViewportOverlays />

          {/* Selection Box */}
          <SimpleSelectionBox />

          {/* Mesh Cache Stats - Show when stats are enabled */}
          {showStats && <MeshCacheStats />}

          {/* Box Select Hint - Show when Shift is held */}
          {isBoxSelectMode && showBoxSelectHint && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 flex items-center gap-2 rounded-2xl bg-background/95 backdrop-blur-sm border px-3 py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <span className="text-sm text-muted-foreground">Hold</span>
              <Kbd>Shift</Kbd>
              <span className="text-sm text-muted-foreground">+ hold</span>
              <HugeiconsIcon icon={Mouse01Icon} className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                and drag on scene to select objects.
              </span>
              <button
                type="button"
                onClick={() => setShowBoxSelectHint(false)}
                className="ml-1 p-0.5 rounded-2xl hover:bg-muted transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

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
