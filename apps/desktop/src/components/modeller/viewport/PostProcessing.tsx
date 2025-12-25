/**
 * PostProcessing Component
 *
 * Provides high-quality rendering effects for CAD/Blender-like visuals:
 * - SSAO: Screen Space Ambient Occlusion for realistic shadows
 * - Bloom: Glow effect for emissive materials
 * - SSR: Screen Space Reflections for metallic surfaces
 * - Tone Mapping: ACES Filmic for cinematic color grading
 */

import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  SMAA,
  SSAO,
  ToneMapping,
} from "@react-three/postprocessing"
import { BlendFunction, ToneMappingMode } from "postprocessing"
import { memo } from "react"
import * as THREE from "three"

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
  /** Reflection intensity (0-1) */
  reflection?: number
  /** Scene brightness multiplier (0-5) */
  brightness?: number
  /** Scene contrast multiplier (0-2) */
  contrast?: number
  /** Rim light intensity (0-1) */
  rimLight?: number
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
    ssaoRadius: 0.1,
    ssaoIntensity: 0.8,
    ssoaBias: 0.05,
    bloomIntensity: 0.1,
    bloomLuminanceThreshold: 1.0, // Almost no bloom
    bloomLuminanceSmoothing: 0.1,
    bloomResolution: 128,
    ssaoResolutionScale: 0.5,
  },
  medium: {
    multisampling: 2,
    ssaoSamples: 21,
    ssaoRadius: 0.2,
    ssaoIntensity: 2.0,
    ssoaBias: 0.03,
    bloomIntensity: 0.3,
    bloomLuminanceThreshold: 0.9,
    bloomLuminanceSmoothing: 0.5,
    bloomResolution: 256,
    ssaoResolutionScale: 0.5,
  },
  high: {
    multisampling: 4,
    ssaoSamples: 48,
    ssaoRadius: 0.4,
    ssaoIntensity: 4.0, // Much stronger AO
    ssoaBias: 0.015,
    bloomIntensity: 0.8, // More visible bloom
    bloomLuminanceThreshold: 0.85,
    bloomLuminanceSmoothing: 0.7,
    bloomResolution: 512,
    ssaoResolutionScale: 1.0,
  },
  ultra: {
    multisampling: 8,
    ssaoSamples: 64,
    ssaoRadius: 0.6,
    ssaoIntensity: 7.0, // Very dramatic contact shadows
    ssoaBias: 0.01,
    bloomIntensity: 1.2, // Cinematic bloom
    bloomLuminanceThreshold: 0.8,
    bloomLuminanceSmoothing: 0.9,
    bloomResolution: 1024,
    ssaoResolutionScale: 1.0,
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
  reflection = 0,
  brightness = 1,
  contrast = 1,
  rimLight = 0,
}: PostProcessingProps) {
  const config = QUALITY_CONFIG[quality]

  // Optimize multisampling based on effects enabled
  const effectiveMultisampling = enableSSAO || enableBloom ? config.multisampling : 0

  // Calculate brightness/contrast adjustments
  // Brightness: 0-5 maps to -1 to 1 (neutral at 1.0)
  const brightnessAdjustment = (brightness - 1) * 0.5
  // Contrast: 0-2 maps to -1 to 1 (neutral at 1.0)
  const contrastAdjustment = (contrast - 1) * 0.5

  return (
    <EffectComposer multisampling={effectiveMultisampling} enableNormalPass={enableSSAO}>
      {/* SSAO - Ambient Occlusion for depth and realism - Optimizado para menos ruido */}
      {/* Only render if enabled for performance */}
      {enableSSAO && (
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={config.ssaoSamples}
          radius={config.ssaoRadius}
          intensity={config.ssaoIntensity}
          bias={config.ssoaBias}
          luminanceInfluence={0.7}
          color={new THREE.Color("black")}
          distanceThreshold={1.2}
          distanceFalloff={0.1}
          rangeThreshold={0.0005}
          rangeFalloff={0.0001}
          minRadiusScale={0.5}
          depthAwareUpsampling={true}
          resolutionScale={config.ssaoResolutionScale}
        />
      )}

      {/* Bloom - Glow effect for bright areas and metals */}
      {/* Only render if enabled for performance */}
      {enableBloom && (
        <Bloom
          intensity={config.bloomIntensity}
          luminanceThreshold={config.bloomLuminanceThreshold}
          luminanceSmoothing={config.bloomLuminanceSmoothing}
          radius={0.5}
          mipmapBlur
        />
      )}

      {/* Brightness & Contrast - Scene color adjustments */}
      {(brightnessAdjustment !== 0 || contrastAdjustment !== 0) && (
        <BrightnessContrast brightness={brightnessAdjustment} contrast={contrastAdjustment} />
      )}

      {/* Tone Mapping - ACES Filmic for cinematic look */}
      {/* Always enabled for consistent color grading */}
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
      {/* Only render if enabled for performance */}
      {enableAA && <SMAA />}
    </EffectComposer>
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default PostProcessing
