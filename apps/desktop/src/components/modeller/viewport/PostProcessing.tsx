/**
 * PostProcessing Component
 *
 * Provides high-quality rendering effects for CAD/Blender-like visuals:
 * - SSAO: Screen Space Ambient Occlusion for realistic shadows
 * - Bloom: Glow effect for emissive materials
 * - SSR: Screen Space Reflections for metallic surfaces
 * - Tone Mapping: ACES Filmic for cinematic color grading
 */

import { Bloom, EffectComposer, SMAA, SSAO, ToneMapping } from "@react-three/postprocessing"
import { BlendFunction, ToneMappingMode } from "postprocessing"
import { memo } from "react"

// ============================================================================
// TYPES
// ============================================================================

export type QualityPreset = "low" | "medium" | "high" | "ultra"

export interface PostProcessingProps {
  /** Quality preset affecting multisampling and effect resolution */
  quality?: QualityPreset
  /** Enable SSAO for ambient occlusion */
  enableSSAO?: boolean
  /** Enable Bloom for glow effects */
  enableBloom?: boolean
  /** Enable anti-aliasing */
  enableAA?: boolean
}

// ============================================================================
// QUALITY CONFIGURATIONS
// ============================================================================

const QUALITY_CONFIG = {
  low: {
    multisampling: 0,
    ssaoSamples: 8,
    ssaoRadius: 0.4,
    bloomLuminanceSmoothing: 0.7,
    bloomResolution: 128,
  },
  medium: {
    multisampling: 2,
    ssaoSamples: 16,
    ssaoRadius: 0.5,
    bloomLuminanceSmoothing: 0.9,
    bloomResolution: 256,
  },
  high: {
    multisampling: 4,
    ssaoSamples: 32,
    ssaoRadius: 0.6,
    bloomLuminanceSmoothing: 0.95,
    bloomResolution: 512,
  },
  ultra: {
    multisampling: 8,
    ssaoSamples: 64,
    ssaoRadius: 0.7,
    bloomLuminanceSmoothing: 0.99,
    bloomResolution: 1024,
  },
} as const

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PostProcessing effects for high-quality CAD rendering
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <Scene />
 *   <PostProcessing quality="high" enableSSAO enableBloom />
 * </Canvas>
 * ```
 */
export const PostProcessing = memo(function PostProcessing({
  quality = "medium",
  enableSSAO = true,
  enableBloom = true,
  enableAA = true,
}: PostProcessingProps) {
  const config = QUALITY_CONFIG[quality]

  return (
    <EffectComposer multisampling={config.multisampling} enableNormalPass={enableSSAO}>
      {/* SSAO - Ambient Occlusion for depth and realism */}
      {enableSSAO && (
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={config.ssaoSamples}
          radius={config.ssaoRadius}
          intensity={20}
          bias={0.015}
          luminanceInfluence={0.5}
          color="black"
        />
      )}

      {/* Bloom - Glow effect for bright areas and metals */}
      {enableBloom && (
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.85}
          luminanceSmoothing={config.bloomLuminanceSmoothing}
          radius={0.5}
          mipmapBlur
        />
      )}

      {/* Tone Mapping - ACES Filmic for cinematic look */}
      <ToneMapping
        mode={ToneMappingMode.ACES_FILMIC}
        adaptive={true}
        resolution={256}
        middleGrey={0.6}
        maxLuminance={16.0}
        averageLuminance={1.0}
        adaptationRate={1.5}
      />

      {/* Anti-aliasing - SMAA for clean edges */}
      {enableAA && <SMAA />}
    </EffectComposer>
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default PostProcessing
