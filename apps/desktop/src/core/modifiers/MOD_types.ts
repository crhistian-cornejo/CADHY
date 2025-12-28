/**
 * @fileoverview Modifier Types - Core definitions for non-destructive modifiers
 * @module core/modifiers
 *
 * Blender-inspired modifier system for non-destructive geometry editing.
 * Modifiers are stacked and evaluated in order to produce final geometry.
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export type ModifierType =
  | "array"
  | "mirror"
  | "boolean"
  | "bevel"
  | "solidify"
  | "shell"
  | "subdivision"
  | "decimate"
  | "remesh"

export type ModifierVisibility = {
  /** Show in viewport */
  viewport: boolean
  /** Apply on render/export */
  render: boolean
  /** Show in edit mode */
  editMode: boolean
}

export interface ModifierBase {
  /** Unique identifier */
  id: string
  /** Modifier type */
  type: ModifierType
  /** Display name */
  name: string
  /** Is modifier enabled */
  enabled: boolean
  /** Is modifier expanded in UI */
  expanded: boolean
  /** Visibility settings */
  visibility: ModifierVisibility
  /** Order in stack (lower = first) */
  order: number
  /** Error message if evaluation failed */
  error?: string
}

// ============================================================================
// ARRAY MODIFIER
// ============================================================================

export type ArrayFitType = "fixed_count" | "fit_length" | "fit_curve"
export type ArrayOffsetType = "relative" | "constant" | "object"

export interface ModifierArray extends ModifierBase {
  type: "array"
  /** How to determine array count */
  fitType: ArrayFitType
  /** Number of copies (for fixed_count) */
  count: number
  /** Total length to fit (for fit_length) */
  fitLength: number
  /** Curve object ID (for fit_curve) */
  curveId?: string

  /** Use relative offset */
  useRelativeOffset: boolean
  /** Relative offset factor (1.0 = object size) */
  relativeOffset: { x: number; y: number; z: number }

  /** Use constant offset */
  useConstantOffset: boolean
  /** Constant offset in world units */
  constantOffset: { x: number; y: number; z: number }

  /** Merge vertices at boundaries */
  mergeVertices: boolean
  /** Merge distance threshold */
  mergeDistance: number

  /** Cap start with object */
  startCapId?: string
  /** Cap end with object */
  endCapId?: string
}

// ============================================================================
// MIRROR MODIFIER
// ============================================================================

export interface ModifierMirror extends ModifierBase {
  type: "mirror"
  /** Mirror across X axis */
  axisX: boolean
  /** Mirror across Y axis */
  axisY: boolean
  /** Mirror across Z axis */
  axisZ: boolean
  /** Use mirror object for axis */
  mirrorObjectId?: string
  /** Merge vertices on axis */
  merge: boolean
  /** Merge threshold distance */
  mergeThreshold: number
  /** Bisect geometry on axis */
  bisect: boolean
  /** Flip normals on mirrored side */
  flip: boolean
  /** Mirror U texture coordinate */
  mirrorU: boolean
  /** Mirror V texture coordinate */
  mirrorV: boolean
  /** U offset for mirrored UVs */
  offsetU: number
  /** V offset for mirrored UVs */
  offsetV: number
}

// ============================================================================
// BOOLEAN MODIFIER
// ============================================================================

export type BooleanOperation = "union" | "difference" | "intersect"
export type BooleanSolver = "fast" | "exact"

export interface ModifierBoolean extends ModifierBase {
  type: "boolean"
  /** Boolean operation type */
  operation: BooleanOperation
  /** Target object ID */
  objectId: string
  /** Solver type */
  solver: BooleanSolver
  /** Use self intersection */
  useSelf: boolean
  /** Hole tolerance for exact solver */
  holeTolerant: boolean
}

// ============================================================================
// BEVEL MODIFIER
// ============================================================================

export type BevelAffectType = "vertices" | "edges"
export type BevelLimitMethod = "none" | "angle" | "weight" | "vgroup"
export type BevelMiterOuter = "sharp" | "patch" | "arc"
export type BevelMiterInner = "sharp" | "arc"
export type BevelVMeshMethod = "grid_fill" | "cutoff"
export type BevelProfile = "superellipse" | "custom"

export interface ModifierBevel extends ModifierBase {
  type: "bevel"
  /** Affect vertices or edges */
  affect: BevelAffectType
  /** Bevel width/amount */
  width: number
  /** Number of segments */
  segments: number
  /** Limit method */
  limitMethod: BevelLimitMethod
  /** Angle limit (radians) for angle method */
  angleLimit: number
  /** Vertex group name for vgroup method */
  vertexGroup?: string
  /** Profile shape (0-1, 0.5 = circular) */
  profile: number
  /** Profile type */
  profileType: BevelProfile
  /** Material index for new faces */
  materialIndex: number
  /** Harden normals */
  hardenNormals: boolean
  /** Clamp overlap */
  clampOverlap: boolean
  /** Loop slide */
  loopSlide: boolean
  /** Outer miter type */
  miterOuter: BevelMiterOuter
  /** Inner miter type */
  miterInner: BevelMiterInner
  /** Spread for arc miter */
  spread: number
  /** Intersection method */
  vmeshMethod: BevelVMeshMethod
  /** Mark seam */
  markSeam: boolean
  /** Mark sharp */
  markSharp: boolean
}

// ============================================================================
// SOLIDIFY MODIFIER
// ============================================================================

export type SolidifyMode = "simple" | "complex"
export type SolidifyNonManifold = "none" | "simple" | "constraints"

export interface ModifierSolidify extends ModifierBase {
  type: "solidify"
  /** Solidify mode */
  mode: SolidifyMode
  /** Thickness */
  thickness: number
  /** Offset (-1 to 1, 0 = centered) */
  offset: number
  /** Use even thickness */
  evenThickness: boolean
  /** Vertex group for variable thickness */
  vertexGroup?: string
  /** Fill rim */
  fillRim: boolean
  /** Only rim (hollow) */
  onlyRim: boolean
  /** Flip normals */
  flipNormals: boolean
  /** Material offset for rim */
  rimMaterialOffset: number
  /** Material offset for shell */
  shellMaterialOffset: number
  /** Merge threshold */
  mergeThreshold: number
  /** Non-manifold handling */
  nonManifold: SolidifyNonManifold
  /** Boundary handling (complex mode) */
  boundaryShape: "none" | "round" | "flat"
}

// ============================================================================
// SHELL MODIFIER (CADHY-specific for hydraulic channels)
// ============================================================================

export interface ModifierShell extends ModifierBase {
  type: "shell"
  /** Wall thickness */
  thickness: number
  /** Open faces (by index) */
  openFaces: number[]
  /** Uniform thickness or variable */
  uniformThickness: boolean
  /** Offset direction: -1 (inward), 0 (centered), 1 (outward) */
  offsetDirection: number
}

// ============================================================================
// SUBDIVISION MODIFIER
// ============================================================================

export type SubdivisionType = "catmull_clark" | "simple"
export type SubdivisionBoundary = "preserve_corners" | "all" | "none"

export interface ModifierSubdivision extends ModifierBase {
  type: "subdivision"
  /** Subdivision type */
  subdivType: SubdivisionType
  /** Subdivision levels in viewport */
  levelsViewport: number
  /** Subdivision levels for render */
  levelsRender: number
  /** Quality (1-10) */
  quality: number
  /** UV smooth */
  uvSmooth: "none" | "preserve_corners" | "preserve_corners_junctions" | "smooth_all"
  /** Boundary smooth */
  boundarySmooth: SubdivisionBoundary
  /** Use creases */
  useCreases: boolean
  /** Optimal display */
  optimalDisplay: boolean
}

// ============================================================================
// DECIMATE MODIFIER
// ============================================================================

export type DecimateMode = "collapse" | "unsubdiv" | "dissolve"

export interface ModifierDecimate extends ModifierBase {
  type: "decimate"
  /** Decimate mode */
  decimateMode: DecimateMode
  /** Ratio (0-1) for collapse mode */
  ratio: number
  /** Iterations for unsubdiv mode */
  iterations: number
  /** Angle limit for dissolve mode */
  angleLimit: number
  /** Use symmetry */
  useSymmetry: boolean
  /** Symmetry axis */
  symmetryAxis: "x" | "y" | "z"
  /** Vertex group */
  vertexGroup?: string
  /** Invert vertex group */
  invertVertexGroup: boolean
  /** Triangulate */
  triangulate: boolean
  /** Resulting face count (read-only) */
  faceCount?: number
}

// ============================================================================
// REMESH MODIFIER
// ============================================================================

export type RemeshMode = "blocks" | "smooth" | "sharp" | "voxel"

export interface ModifierRemesh extends ModifierBase {
  type: "remesh"
  /** Remesh mode */
  remeshMode: RemeshMode
  /** Octree depth (1-12) */
  octreeDepth: number
  /** Scale (for non-voxel) */
  scale: number
  /** Sharpness (for sharp mode) */
  sharpness: number
  /** Voxel size (for voxel mode) */
  voxelSize: number
  /** Adaptivity (for voxel mode) */
  adaptivity: number
  /** Use smooth shading */
  useSmoothShade: boolean
  /** Preserve volume (voxel) */
  usePreserveVolume: boolean
  /** Remove disconnected pieces */
  useRemoveDisconnected: boolean
  /** Threshold for disconnected removal */
  threshold: number
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type Modifier =
  | ModifierArray
  | ModifierMirror
  | ModifierBoolean
  | ModifierBevel
  | ModifierSolidify
  | ModifierShell
  | ModifierSubdivision
  | ModifierDecimate
  | ModifierRemesh

// ============================================================================
// MODIFIER STACK
// ============================================================================

export interface ModifierStack {
  /** Object ID this stack belongs to */
  objectId: string
  /** Ordered list of modifiers */
  modifiers: Modifier[]
  /** Is stack currently being evaluated */
  isEvaluating: boolean
  /** Last evaluation time in ms */
  lastEvalTime?: number
  /** Cached result shape ID */
  cachedResultId?: string
  /** Cache is valid */
  cacheValid: boolean
}

// ============================================================================
// MODIFIER EVALUATION
// ============================================================================

export interface ModifierEvalContext {
  /** Base shape ID to modify */
  baseShapeId: string
  /** Scene objects for references */
  sceneObjects: Map<string, { shapeId: string }>
  /** Deflection for tessellation */
  deflection: number
  /** Is this for viewport or render */
  forRender: boolean
}

export interface ModifierEvalResult {
  /** Success */
  success: boolean
  /** Result shape ID */
  resultShapeId?: string
  /** Error message */
  error?: string
  /** Evaluation time in ms */
  evalTimeMs: number
  /** Per-modifier timing */
  modifierTiming: { id: string; timeMs: number }[]
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createModifier(type: ModifierType, name?: string): Modifier {
  const base: Omit<ModifierBase, "type"> = {
    id: crypto.randomUUID(),
    name: name ?? type.charAt(0).toUpperCase() + type.slice(1),
    enabled: true,
    expanded: true,
    visibility: { viewport: true, render: true, editMode: false },
    order: 0,
  }

  switch (type) {
    case "array":
      return {
        ...base,
        type: "array",
        fitType: "fixed_count",
        count: 2,
        fitLength: 10,
        useRelativeOffset: true,
        relativeOffset: { x: 1, y: 0, z: 0 },
        useConstantOffset: false,
        constantOffset: { x: 0, y: 0, z: 0 },
        mergeVertices: false,
        mergeDistance: 0.001,
      }
    case "mirror":
      return {
        ...base,
        type: "mirror",
        axisX: true,
        axisY: false,
        axisZ: false,
        merge: true,
        mergeThreshold: 0.001,
        bisect: false,
        flip: false,
        mirrorU: false,
        mirrorV: false,
        offsetU: 0,
        offsetV: 0,
      }
    case "boolean":
      return {
        ...base,
        type: "boolean",
        operation: "difference",
        objectId: "",
        solver: "exact",
        useSelf: false,
        holeTolerant: false,
      }
    case "bevel":
      return {
        ...base,
        type: "bevel",
        affect: "edges",
        width: 0.1,
        segments: 3,
        limitMethod: "none",
        angleLimit: Math.PI / 6,
        profile: 0.5,
        profileType: "superellipse",
        materialIndex: -1,
        hardenNormals: true,
        clampOverlap: true,
        loopSlide: true,
        miterOuter: "sharp",
        miterInner: "sharp",
        spread: 0.1,
        vmeshMethod: "grid_fill",
        markSeam: false,
        markSharp: false,
      }
    case "solidify":
      return {
        ...base,
        type: "solidify",
        mode: "simple",
        thickness: 0.1,
        offset: 0,
        evenThickness: true,
        fillRim: true,
        onlyRim: false,
        flipNormals: false,
        rimMaterialOffset: 0,
        shellMaterialOffset: 0,
        mergeThreshold: 0.0001,
        nonManifold: "none",
        boundaryShape: "none",
      }
    case "shell":
      return {
        ...base,
        type: "shell",
        thickness: 0.1,
        openFaces: [],
        uniformThickness: true,
        offsetDirection: -1,
      }
    case "subdivision":
      return {
        ...base,
        type: "subdivision",
        subdivType: "catmull_clark",
        levelsViewport: 1,
        levelsRender: 2,
        quality: 3,
        uvSmooth: "preserve_corners",
        boundarySmooth: "preserve_corners",
        useCreases: true,
        optimalDisplay: true,
      }
    case "decimate":
      return {
        ...base,
        type: "decimate",
        decimateMode: "collapse",
        ratio: 0.5,
        iterations: 1,
        angleLimit: Math.PI / 36,
        useSymmetry: false,
        symmetryAxis: "x",
        invertVertexGroup: false,
        triangulate: true,
      }
    case "remesh":
      return {
        ...base,
        type: "remesh",
        remeshMode: "voxel",
        octreeDepth: 4,
        scale: 0.9,
        sharpness: 1.0,
        voxelSize: 0.1,
        adaptivity: 0.0,
        useSmoothShade: true,
        usePreserveVolume: true,
        useRemoveDisconnected: true,
        threshold: 0.01,
      }
    default:
      throw new Error(`Unknown modifier type: ${type}`)
  }
}

export function cloneModifier(modifier: Modifier): Modifier {
  return {
    ...JSON.parse(JSON.stringify(modifier)),
    id: crypto.randomUUID(),
    name: `${modifier.name} Copy`,
  }
}
