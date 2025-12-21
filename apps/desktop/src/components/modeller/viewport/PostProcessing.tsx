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

/**
 * Quality configurations for post-processing effects.
 *
 * The main tradeoffs are:
 * - Low: Minimal effects, best for slow hardware or complex scenes
 * - Medium: Balanced quality and performance (recommended)
 * - High: Enhanced effects, noticeable ambient occlusion
 * - Ultra: Maximum quality with strong SSAO and high-res bloom
 *
 * Note: On modern GPUs, all presets typically maintain 60fps.
 * The visual difference is most apparent with complex geometry.
 */
const QUALITY_CONFIG = {
  low: {
    multisampling: 0,
    ssaoSamples: 8,
    ssaoRadius: 0.15,
    ssaoIntensity: 0.5, // Very subtle AO
    ssoaBias: 0.03,
    bloomIntensity: 0.2,
    bloomLuminanceThreshold: 0.9,
    bloomLuminanceSmoothing: 0.5,
    bloomResolution: 128,
    ssaoResolutionScale: 0.5, // Half resolution for speed
  },
  medium: {
    multisampling: 2,
    ssaoSamples: 24,
    ssaoRadius: 0.25,
    ssaoIntensity: 1.5, // Visible AO in corners
    ssoaBias: 0.02,
    bloomIntensity: 0.4,
    bloomLuminanceThreshold: 0.85,
    bloomLuminanceSmoothing: 0.7,
    bloomResolution: 256,
    ssaoResolutionScale: 0.75,
  },
  high: {
    multisampling: 4,
    ssaoSamples: 48,
    ssaoRadius: 0.4,
    ssaoIntensity: 3.0, // Strong AO, clearly visible
    ssoaBias: 0.015,
    bloomIntensity: 0.5,
    bloomLuminanceThreshold: 0.8,
    bloomLuminanceSmoothing: 0.85,
    bloomResolution: 512,
    ssaoResolutionScale: 1,
  },
  ultra: {
    multisampling: 8,
    ssaoSamples: 64,
    ssaoRadius: 0.5,
    ssaoIntensity: 5.0, // Very strong AO for dramatic effect
    ssoaBias: 0.01,
    bloomIntensity: 0.6,
    bloomLuminanceThreshold: 0.75,
    bloomLuminanceSmoothing: 0.95,
    bloomResolution: 1024,
    ssaoResolutionScale: 1,
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
      {/* SSAO - Ambient Occlusion for depth and realism - Optimizado para menos ruido */}
      {enableSSAO && (
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={config.ssaoSamples}
          radius={config.ssaoRadius}
          intensity={config.ssaoIntensity}
          bias={config.ssoaBias} // Bias ajustable por calidad
          luminanceInfluence={0.7} // Mayor influencia de luminancia
          color="black"
          distanceThreshold={1.2} // Mayor threshold para menos ruido
          distanceFalloff={0.1} // Falloff más suave
          rangeThreshold={0.0005} // Reducido
          rangeFalloff={0.0001} // Reducido
          minRadiusScale={0.5} // Mayor escala mínima
          depthAwareUpsampling={true}
          resolutionScale={config.ssaoResolutionScale}
        />
      )}

      {/* Bloom - Glow effect for bright areas and metals */}
      {enableBloom && (
        <Bloom
          intensity={config.bloomIntensity}
          luminanceThreshold={config.bloomLuminanceThreshold}
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
