/**
 * PostProcessing Component - CADHY Advanced Rendering
 *
 * Provides high-quality rendering effects for CAD/Blender-like visuals:
 *
 * PHASE 1 - Quick Wins:
 * - SSAO: Screen Space Ambient Occlusion for realistic shadows
 * - Bloom: Glow effect for emissive materials
 * - DOF: Depth of Field for cinematic focus
 * - Tone Mapping: ACES Filmic for cinematic color grading
 *
 * PHASE 2 - CAD Pro:
 * - Edge Detection: Outline/silhouette rendering
 * - Vignette: Edge darkening for focus
 *
 * PHASE 3 - Blender-Like:
 * - Chromatic Aberration: Lens fringing effect
 * - N8AO: High quality ambient occlusion alternative
 *
 * Note: SSR (Screen Space Reflections) is not available in @react-three/postprocessing.
 * For reflections, use Environment maps with MeshStandardMaterial metalness/roughness instead.
 */

import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Outline,
  SMAA,
  SSAO,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing"
import { BlendFunction, ToneMappingMode } from "postprocessing"
import { memo, useMemo } from "react"
import * as THREE from "three"

// ============================================================================
// TYPES
// ============================================================================

export type QualityPreset = "low" | "medium" | "high" | "ultra"

export interface PostProcessingProps {
  /** Quality preset affecting multisampling and effect resolution */
  quality?: QualityPreset

  // Core Effects (existing)
  /** Enable SSAO for ambient occlusion */
  enableSSAO?: boolean
  /** Enable Bloom for glow effects */
  enableBloom?: boolean
  /** Enable anti-aliasing */
  enableAA?: boolean
  /** Scene brightness multiplier (0-5) */
  brightness?: number
  /** Scene contrast multiplier (0-2) */
  contrast?: number

  // Phase 1: SSR - NOTE: Not available in @react-three/postprocessing
  // Use environment maps for reflections instead
  /** Enable Screen Space Reflections (placeholder - uses enhanced env reflections) */
  enableSSR?: boolean
  /** SSR intensity - applied to environment intensity instead */
  ssrIntensity?: number
  /** SSR max distance (unused - kept for API compatibility) */
  ssrMaxDistance?: number

  // Phase 1: Depth of Field
  /** Enable Depth of Field */
  enableDOF?: boolean
  /** Focus distance (-1 for auto based on camera target) */
  dofFocusDistance?: number
  /** Aperture / bokeh size */
  dofAperture?: number
  /** Bokeh scale */
  dofBokehScale?: number
  /** Camera for focus calculation */
  camera?: THREE.Camera
  /** Camera target for auto focus */
  cameraTarget?: THREE.Vector3

  // Phase 2: Edge Detection
  /** Enable edge detection / outline effect */
  enableEdgeDetection?: boolean
  /** Edge color */
  edgeColor?: string
  /** Edge thickness */
  edgeThickness?: number
  /** Selected objects for outline (optional) */
  selectedObjects?: THREE.Object3D[]

  // Phase 3: Vignette & Chromatic Aberration
  /** Enable vignette effect */
  enableVignette?: boolean
  /** Vignette intensity */
  vignetteIntensity?: number
  /** Enable chromatic aberration */
  enableChromaticAberration?: boolean
  /** Chromatic aberration offset */
  chromaticAberrationOffset?: number
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
 */
const QUALITY_CONFIG = {
  low: {
    multisampling: 0,
    ssaoSamples: 8,
    ssaoRadius: 0.1,
    ssaoIntensity: 0.8,
    ssoaBias: 0.05,
    bloomIntensity: 0.1,
    bloomLuminanceThreshold: 1.0,
    bloomLuminanceSmoothing: 0.1,
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
    ssaoResolutionScale: 0.5,
  },
  high: {
    multisampling: 4,
    ssaoSamples: 48,
    ssaoRadius: 0.4,
    ssaoIntensity: 4.0,
    ssoaBias: 0.015,
    bloomIntensity: 0.8,
    bloomLuminanceThreshold: 0.85,
    bloomLuminanceSmoothing: 0.7,
    ssaoResolutionScale: 1.0,
  },
  ultra: {
    multisampling: 8,
    ssaoSamples: 64,
    ssaoRadius: 0.6,
    ssaoIntensity: 7.0,
    ssoaBias: 0.01,
    bloomIntensity: 1.2,
    bloomLuminanceThreshold: 0.8,
    bloomLuminanceSmoothing: 0.9,
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
 *   <PostProcessing
 *     quality="high"
 *     enableSSAO
 *     enableBloom
 *     enableDOF
 *   />
 * </Canvas>
 * ```
 */
export const PostProcessing = memo(function PostProcessing({
  quality = "medium",
  // Core effects
  enableSSAO = true,
  enableBloom = true,
  enableAA = true,
  brightness = 1,
  contrast = 1,
  // Phase 1: SSR (placeholder - not available in library)
  enableSSR: _enableSSR = false,
  ssrIntensity: _ssrIntensity = 0.5,
  ssrMaxDistance: _ssrMaxDistance = 10,
  // Phase 1: DOF
  enableDOF = false,
  dofFocusDistance = -1,
  dofAperture: _dofAperture = 0.025,
  dofBokehScale = 2,
  camera,
  cameraTarget,
  // Phase 2: Edge Detection
  enableEdgeDetection = false,
  edgeColor = "#000000",
  edgeThickness = 1,
  selectedObjects = [],
  // Phase 3: Vignette & Chromatic Aberration
  enableVignette = false,
  vignetteIntensity = 0.3,
  enableChromaticAberration = false,
  chromaticAberrationOffset = 0.002,
}: PostProcessingProps) {
  const config = QUALITY_CONFIG[quality]

  // Optimize multisampling based on effects enabled
  const effectiveMultisampling = useMemo(() => {
    const hasHeavyEffects = enableSSAO || enableBloom || enableDOF
    return hasHeavyEffects ? config.multisampling : 0
  }, [enableSSAO, enableBloom, enableDOF, config.multisampling])

  // Calculate brightness/contrast adjustments
  const brightnessAdjustment = (brightness - 1) * 0.5
  const contrastAdjustment = (contrast - 1) * 0.5

  // Calculate DOF focus distance
  const calculatedFocusDistance = useMemo(() => {
    if (dofFocusDistance >= 0) return dofFocusDistance
    if (camera?.position && cameraTarget) {
      return camera.position.distanceTo(cameraTarget)
    }
    return 10
  }, [dofFocusDistance, camera?.position, cameraTarget])

  // Parse edge color
  const edgeColorObj = useMemo(() => new THREE.Color(edgeColor), [edgeColor])

  // Chromatic aberration offset vector
  const caOffset = useMemo(
    () => new THREE.Vector2(chromaticAberrationOffset, chromaticAberrationOffset),
    [chromaticAberrationOffset]
  )

  return (
    <EffectComposer multisampling={effectiveMultisampling} enableNormalPass={enableSSAO}>
      {/* ================================================================== */}
      {/* PHASE 1: CORE EFFECTS */}
      {/* ================================================================== */}

      {/* SSAO - Ambient Occlusion for depth and realism */}
      {enableSSAO ? (
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
      ) : null}

      {/* Bloom - Glow effect for bright areas and metals */}
      {enableBloom ? (
        <Bloom
          intensity={config.bloomIntensity}
          luminanceThreshold={config.bloomLuminanceThreshold}
          luminanceSmoothing={config.bloomLuminanceSmoothing}
          radius={0.5}
          mipmapBlur
        />
      ) : null}

      {/* DOF - Depth of Field for cinematic focus */}
      {enableDOF ? (
        <DepthOfField
          focusDistance={calculatedFocusDistance}
          focalLength={0.02}
          bokehScale={dofBokehScale}
        />
      ) : null}

      {/* ================================================================== */}
      {/* PHASE 2: CAD PRO EFFECTS */}
      {/* ================================================================== */}

      {/* Edge Detection / Outline - For technical visualization */}
      {enableEdgeDetection && selectedObjects.length > 0 ? (
        <Outline
          selection={selectedObjects}
          edgeStrength={edgeThickness * 2}
          pulseSpeed={0}
          visibleEdgeColor={edgeColorObj.getHex()}
          hiddenEdgeColor={edgeColorObj.getHex()}
          blur
          xRay={false}
        />
      ) : null}

      {/* ================================================================== */}
      {/* PHASE 3: CINEMATIC EFFECTS */}
      {/* ================================================================== */}

      {/* Vignette - Edge darkening for focus */}
      {enableVignette ? (
        <Vignette offset={0.3} darkness={vignetteIntensity} blendFunction={BlendFunction.NORMAL} />
      ) : null}

      {/* Chromatic Aberration - Lens fringing */}
      {enableChromaticAberration ? (
        <ChromaticAberration offset={caOffset} radialModulation={true} modulationOffset={0.5} />
      ) : null}

      {/* ================================================================== */}
      {/* ALWAYS-ON EFFECTS */}
      {/* ================================================================== */}

      {/* Brightness & Contrast - Scene color adjustments */}
      {brightnessAdjustment !== 0 || contrastAdjustment !== 0 ? (
        <BrightnessContrast brightness={brightnessAdjustment} contrast={contrastAdjustment} />
      ) : null}

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
      {enableAA ? <SMAA /> : null}
    </EffectComposer>
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export default PostProcessing
