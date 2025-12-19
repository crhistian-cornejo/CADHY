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
import { Canvas, type RootState } from "@react-three/fiber"
import { Suspense, useCallback, useEffect, useRef } from "react"
import * as THREE from "three"
import { useSounds } from "@/hooks/use-sounds"
import { registerViewportCanvas } from "@/services/thumbnail-service"
import { useIsAnalyzingScene } from "@/stores/chat-store"
import { useViewportSettings } from "@/stores/modeller-store"
import { PlaybackControls } from "./PlaybackControls"
import { SceneContent } from "./SceneContent"

export interface Viewport3DProps {
  className?: string
  showStats?: boolean
  showAnimationPanel?: boolean
}

export function Viewport3D({
  className,
  showStats = false,
  showAnimationPanel = false,
}: Viewport3DProps) {
  const viewportSettings = useViewportSettings()
  const isAnalyzingScene = useIsAnalyzingScene()
  const { playAiThinking, playAiComplete } = useSounds()

  // Track previous analyzing state to play sounds on transitions
  const wasAnalyzingRef = useRef(false)

  // Register canvas for thumbnail capture
  const handleCreated = useCallback((state: RootState) => {
    registerViewportCanvas(state.gl.domElement)
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
      <div className={cn("relative h-full w-full", className)}>
        <Canvas
          shadows={viewportSettings.shadows}
          dpr={[1, 1.5]}
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
          <Suspense fallback={null}>
            <SceneContent showStats={showStats} />
          </Suspense>
        </Canvas>

        {/* Viewport Info Overlay */}
        <div className="absolute left-2 top-2 flex flex-col gap-1 text-[10px] text-muted-foreground">
          <span>Viewport</span>
        </div>

        {/* Playback Controls - Only show when animation panel is open */}
        {showAnimationPanel && <PlaybackControls />}
      </div>
    </AIGlowBorder>
  )
}

export default Viewport3D
