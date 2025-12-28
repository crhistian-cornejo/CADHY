/**
 * @fileoverview Render barrel export - RE_* prefixed modules
 * @module render
 */

export * from "./cache"
export * from "./meshes"
// Pool and cache
export * from "./pool"
export { ActiveOperationRenderer } from "./RE_active_operation"
export * from "./RE_cad_icons"
export { CADPreviewMesh } from "./RE_cad_preview_mesh"
export { CursorTracker } from "./RE_cursor_tracker"
export { EdgeGizmo } from "./RE_edge_gizmo"
export { type FrustumCullable, FrustumCuller, frustumCuller } from "./RE_frustum_culler"
export * from "./RE_geometry_utils"
export {
  createBaffleBlockInstances,
  createChuteBlockInstances,
  createEndSillInstances,
  type InstanceData,
  InstancedMeshManager,
  instancingManager,
} from "./RE_instancing"
export { Label3D, Label3DContainer } from "./RE_label3d"
export {
  DEFAULT_LOD_CONFIG,
  type LODConfig,
  type LODLevel,
  LODManager,
  lodManager,
} from "./RE_lod_manager"
export { MeshCacheStats } from "./RE_mesh_cache_stats"
export { ViewportOverlays } from "./RE_overlays"
export {
  PostProcessing,
  type PostProcessingProps,
  type QualityPreset,
} from "./RE_postprocessing"
// Main render components
export { SceneContent } from "./RE_scene_content"
export * from "./RE_scene_utils"
export { AutoSectionPlane, SectionPlane } from "./RE_section_plane"
// Services
export * from "./RE_texture_service"
export {
  useMemoizedTextures,
  usePBRTextures,
  useTextureCategories,
  useTextureList,
  useTextures,
} from "./RE_textures_hook"
export { TopologicalWireframe } from "./RE_topological_wireframe"
export * from "./RE_viewport_registry"
export { Viewport2D } from "./RE_viewport2d"
export { Viewport3D } from "./RE_viewport3d"
