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
    ssaoSamples: 16, // Más samples = menos ruido
    ssaoRadius: 0.2, // Radio reducido
    ssaoIntensity: 1.5, // MUCHO más bajo para reducir ruido
    ssoaBias: 0.025,
    bloomLuminanceSmoothing: 0.7,
    bloomResolution: 128,
    ssaoResolutionScale: 1, // Full res para menos ruido
  },
  medium: {
    multisampling: 2,
    ssaoSamples: 32, // Más samples
    ssaoRadius: 0.25,
    ssaoIntensity: 2.0, // Reducido drásticamente
    ssoaBias: 0.02,
    bloomLuminanceSmoothing: 0.9,
    bloomResolution: 256,
    ssaoResolutionScale: 1,
  },
  high: {
    multisampling: 4,
    ssaoSamples: 64, // Muchos más samples
    ssaoRadius: 0.3,
    ssaoIntensity: 2.5, // Reducido
    ssoaBias: 0.015,
    bloomLuminanceSmoothing: 0.95,
    bloomResolution: 512,
    ssaoResolutionScale: 1,
  },
  ultra: {
    multisampling: 8,
    ssaoSamples: 128, // Máximos samples para calidad
    ssaoRadius: 0.35,
    ssaoIntensity: 3.0, // Aún bajo
    ssoaBias: 0.01,
    bloomLuminanceSmoothing: 0.99,
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
