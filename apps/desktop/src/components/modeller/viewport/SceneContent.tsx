/**
 * SceneContent Component
 *
 * Contains all 3D scene elements: camera, controls, lighting, grid, objects,
 * transform gizmos, and navigation helpers.
 */

import { logger } from "@cadhy/shared/logger"
import {
  ContactShadows,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  Stats,
  TransformControls,
} from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import type {
  OrbitControls as OrbitControlsImpl,
  TransformControls as TransformControlsImpl,
} from "three-stdlib"
import { lodManager } from "@/services/lod-manager"
import { registerCamera, registerRenderer, registerScene } from "@/services/viewport-registry"
import {
  type AnySceneObject,
  type ChannelObject,
  type ShapeObject,
  useBoxSelectMode,
  useCameraAnimations,
  useCameraView,
  useCurrentAnimation,
  useFocusObjectId,
  useGridSettings,
  useModellerStore,
  usePlaybackState,
  usePlaybackTime,
  useSelectedIds,
  useSelectedObjects,
  useSnapMode,
  useTransformMode,
  useViewportSettings,
  useVisibleObjects,
} from "@/stores/modeller"
import { getCameraAtTime } from "@/utils/camera-interpolation"
import { SceneObjectMesh } from "./meshes"
import { PostProcessing, type QualityPreset } from "./PostProcessing"

export interface SceneContentProps {
  showStats?: boolean
}

export function SceneContent({ showStats }: SceneContentProps) {
  const visibleObjects = useVisibleObjects()
  const selectedIds = useSelectedIds()
  const selectedObjects = useSelectedObjects()
  const transformMode = useTransformMode()
  const _cameraView = useCameraView()
  const viewportSettings = useViewportSettings()
  const gridSettings = useGridSettings()
  const snapMode = useSnapMode()
  const isBoxSelectMode = useBoxSelectMode()
  const hoveredId = useModellerStore((s) => s.hoveredId)
  const updateObject = useModellerStore((s) => s.updateObject)
  const focusObjectId = useFocusObjectId()
  const clearFocus = useModellerStore((s) => s.clearFocus)
  const getObjectById = useModellerStore((s) => s.getObjectById)

  // Temporary and helper objects from new slices
  const temporaryObjects = useModellerStore((s) => s.temporaryObjects)
  const _helperObjects = useModellerStore((s) => s.helperObjects)

  // Get invalidate function for render-on-demand
  const { invalidate } = useThree()

  // Camera position and target from store
  const storeCameraPosition = useModellerStore((s) => s.cameraPosition)
  const storeCameraTarget = useModellerStore((s) => s.cameraTarget)

  // Animation state
  const animations = useCameraAnimations()
  const currentAnimationId = useCurrentAnimation()
  const playbackState = usePlaybackState()
  const playbackTime = usePlaybackTime()
  const {
    setPlaybackTime,
    stop: stopPlayback,
    setCameraPosition,
    setCameraTarget,
  } = useModellerStore()

  const { select, setHovered } = useModellerStore()

  // Invalidate frame when important things change (render-on-demand optimization)
  useEffect(() => {
    invalidate()
  }, [invalidate])

  // Invalidate during animation playback
  useEffect(() => {
    if (playbackState === "playing") {
      invalidate()
    }
  }, [playbackState, invalidate])

  // Ref for the currently selected mesh (first selected)
  const selectedMeshRef = useRef<THREE.Mesh | THREE.Group>(null)
  const transformControlsRef = useRef<TransformControlsImpl>(null)
  const orbitControlsRef = useRef<OrbitControlsImpl>(null)

  // Animation state for camera focus
  const focusAnimationRef = useRef<{
    active: boolean
    startTarget: THREE.Vector3
    endTarget: THREE.Vector3
    startPosition: THREE.Vector3
    endPosition: THREE.Vector3
    progress: number
  } | null>(null)

  // Get camera, scene and renderer from Three.js context
  const { camera, scene, gl } = useThree()

  // Disable autoUpdate for performance - we'll update manually when needed
  useEffect(() => {
    scene.autoUpdate = false
    scene.matrixAutoUpdate = false
    return () => {
      scene.autoUpdate = true
      scene.matrixAutoUpdate = true
    }
  }, [scene])

  // Register camera, scene and renderer for external access (e.g., selection box, debug stats)
  useEffect(() => {
    registerCamera(camera)
    registerScene(scene)
    registerRenderer(gl)
    return () => {
      registerCamera(null)
      registerScene(null)
      registerRenderer(null)
    }
  }, [camera, scene, gl])

  // Update scene background when viewport settings change
  useEffect(() => {
    if (viewportSettings.backgroundColor) {
      scene.background = new THREE.Color(viewportSettings.backgroundColor)
    }
  }, [scene, viewportSettings.backgroundColor])

  // State to trigger re-render when mesh is ready
  // Track which object id the mesh is ready for to avoid race conditions
  const [meshReadyForId, setMeshReadyForId] = useState<string | null>(null)

  // Get the first selected object for transform
  const firstSelectedObject = selectedObjects.length > 0 ? selectedObjects[0] : null
  const _firstSelectedId = firstSelectedObject?.id

  // Check if mesh is ready for the current selection
  const meshReady = meshReadyForId === _firstSelectedId && _firstSelectedId != null

  // Reset meshReadyForId when selection changes (clear stale state)
  useEffect(() => {
    if (_firstSelectedId !== meshReadyForId) {
      // Selection changed - if mesh ref is already set, we can mark it ready
      // Otherwise wait for onMeshReady callback
      if (selectedMeshRef.current && _firstSelectedId) {
        // Use requestAnimationFrame to allow child effects to run first
        const frame = requestAnimationFrame(() => {
          if (selectedMeshRef.current) {
            setMeshReadyForId(_firstSelectedId)
          }
        })
        return () => cancelAnimationFrame(frame)
      }
    }
  }, [_firstSelectedId, meshReadyForId])

  // Handle focus object - animate camera to center on object
  useEffect(() => {
    if (!focusObjectId || !orbitControlsRef.current) return

    const targetObject = getObjectById(focusObjectId)
    if (!targetObject) {
      clearFocus()
      return
    }

    // Get object position
    const objectPosition = new THREE.Vector3(
      targetObject.transform.position.x,
      targetObject.transform.position.y,
      targetObject.transform.position.z
    )

    // Calculate appropriate camera distance based on object type
    let distance = 8 // Default distance
    if (targetObject.type === "channel") {
      const channel = targetObject as ChannelObject
      distance = Math.max(channel.length * 1.5, 8)
    } else if (targetObject.type === "shape") {
      const shape = targetObject as ShapeObject
      const maxDim = Math.max(
        shape.parameters.width ?? 1,
        shape.parameters.height ?? 1,
        shape.parameters.depth ?? shape.parameters.radius ?? 1
      )
      distance = Math.max(maxDim * 3, 5)
    }

    // Calculate new camera position (offset from object)
    const currentDirection = new THREE.Vector3()
      .subVectors(camera.position, orbitControlsRef.current.target)
      .normalize()

    // If camera is very far or direction is zero, use a default direction
    if (currentDirection.length() < 0.1) {
      currentDirection.set(1, 0.7, 1).normalize()
    }

    const newCameraPosition = objectPosition.clone().add(currentDirection.multiplyScalar(distance))

    // Set up animation
    focusAnimationRef.current = {
      active: true,
      startTarget: orbitControlsRef.current.target.clone(),
      endTarget: objectPosition,
      startPosition: camera.position.clone(),
      endPosition: newCameraPosition,
      progress: 0,
    }
  }, [focusObjectId, camera, getObjectById, clearFocus])

  // Animate camera focus and playback
  useFrame((state, delta) => {
    // Handle focus animation first (higher priority)
    if (focusAnimationRef.current?.active && orbitControlsRef.current) {
      const anim = focusAnimationRef.current
      anim.progress += delta * 3 // Animation speed (adjust for smoother/faster)

      if (anim.progress >= 1) {
        // Animation complete
        orbitControlsRef.current.target.copy(anim.endTarget)
        camera.position.copy(anim.endPosition)
        focusAnimationRef.current = null
        clearFocus()
      } else {
        // Smooth interpolation using easeOutCubic
        const t = 1 - (1 - anim.progress) ** 3

        orbitControlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, t)
        camera.position.lerpVectors(anim.startPosition, anim.endPosition, t)
      }

      orbitControlsRef.current.update()
      state.invalidate() // Invalidate for next frame during animation
      return // Don't process animation playback during focus animation
    }

    // Handle camera animation playback
    if (playbackState === "playing" && currentAnimationId && orbitControlsRef.current) {
      const currentAnimation = animations.find((a) => a.id === currentAnimationId)
      if (!currentAnimation) return

      // CRITICAL: Disable orbit controls during playback
      orbitControlsRef.current.enabled = false

      // Invalidate for continuous rendering during playback
      state.invalidate()

      // Increment playback time
      const newTime = playbackTime + delta

      // Debug: Log animation progress and camera position
      if (Math.floor(newTime * 10) !== Math.floor(playbackTime * 10)) {
        const interpolatedCamera = getCameraAtTime(currentAnimation, newTime)
        logger.log(
          `[Camera Animation] Time: ${newTime.toFixed(1)}s / ${currentAnimation.duration}s`
        )
        logger.log(
          `  Position: (${interpolatedCamera.position.x.toFixed(2)}, ${interpolatedCamera.position.y.toFixed(2)}, ${interpolatedCamera.position.z.toFixed(2)})`
        )
        logger.log(
          `  Target: (${interpolatedCamera.target.x.toFixed(2)}, ${interpolatedCamera.target.y.toFixed(2)}, ${interpolatedCamera.target.z.toFixed(2)})`
        )
      }

      // Check if animation has ended
      if (newTime >= currentAnimation.duration) {
        setPlaybackTime(currentAnimation.duration)
        stopPlayback()

        // Set camera to final position
        const finalCamera = getCameraAtTime(currentAnimation, currentAnimation.duration)
        orbitControlsRef.current.target.set(
          finalCamera.target.x,
          finalCamera.target.y,
          finalCamera.target.z
        )
        camera.position.set(finalCamera.position.x, finalCamera.position.y, finalCamera.position.z)

        // Update store
        setCameraPosition(finalCamera.position)
        setCameraTarget(finalCamera.target)

        // Re-enable orbit controls when animation ends
        orbitControlsRef.current.enabled = true
      } else {
        // Update playback time
        setPlaybackTime(newTime)

        // Get interpolated camera state
        const interpolatedCamera = getCameraAtTime(currentAnimation, newTime)

        // Update Three.js camera
        orbitControlsRef.current.target.set(
          interpolatedCamera.target.x,
          interpolatedCamera.target.y,
          interpolatedCamera.target.z
        )
        camera.position.set(
          interpolatedCamera.position.x,
          interpolatedCamera.position.y,
          interpolatedCamera.position.z
        )

        // Update FOV if it's a perspective camera
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = interpolatedCamera.fov
          camera.updateProjectionMatrix()
        }
      }

      orbitControlsRef.current.update()
    } else if (orbitControlsRef.current) {
      // Re-enable orbit controls when not playing, but NOT if we're dragging transform gizmo
      if (!isDraggingRef.current) {
        orbitControlsRef.current.enabled = true
      }
    }

    // Update LOD (Level of Detail) system for performance optimization
    lodManager.updateLOD(camera, scene)

    // Manual matrix updates (since autoUpdate is disabled for performance)
    scene.updateMatrixWorld()
  })

  // Sync camera with store when cameraPosition or cameraTarget changes
  useEffect(() => {
    if (!orbitControlsRef.current || focusAnimationRef.current?.active) return

    // Validate values before applying - avoid NaN and Infinity
    const isValidNumber = (n: number) => Number.isFinite(n)
    const safeValue = (n: number, fallback: number) => (isValidNumber(n) ? n : fallback)

    const targetX = safeValue(storeCameraTarget.x, 0)
    const targetY = safeValue(storeCameraTarget.y, 0)
    const targetZ = safeValue(storeCameraTarget.z, 0)

    const posX = safeValue(storeCameraPosition.x, 10)
    const posY = safeValue(storeCameraPosition.y, 10)
    const posZ = safeValue(storeCameraPosition.z, 10)

    // Update orbit controls target
    orbitControlsRef.current.target.set(targetX, targetY, targetZ)

    // Update camera position
    camera.position.set(posX, posY, posZ)

    orbitControlsRef.current.update()
  }, [storeCameraPosition, storeCameraTarget, camera])

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      select(id, additive)
    },
    [select]
  )

  const handleHover = useCallback(
    (id: string | null) => {
      setHovered(id)
    },
    [setHovered]
  )

  const handleBackgroundClick = useCallback(() => {
    useModellerStore.getState().deselectAll()
  }, [])

  // Camera projection type - use cameraType from viewport settings (independent of camera view position)
  // This allows combinations like "top view with perspective projection" or "free camera with orthographic"
  // Fallback for backwards compatibility with persisted states that don't have cameraType
  const cameraType = viewportSettings.cameraType ?? "perspective"
  const isOrtho = cameraType === "orthographic"

  // Track if we're currently dragging and store the object name at drag start
  const isDraggingRef = useRef(false)
  const draggedObjectNameRef = useRef<string | null>(null)

  // Save state when starting to drag
  const handleTransformStart = useCallback(() => {
    if (!isDraggingRef.current && firstSelectedObject) {
      isDraggingRef.current = true
      draggedObjectNameRef.current = firstSelectedObject.name
      // Save state before transformation starts
      useModellerStore.getState().saveStateBeforeAction()
      logger.log("[Transform] Started drag on:", firstSelectedObject.name)
    }
  }, [firstSelectedObject])

  // Commit to history when drag ends
  const handleTransformEnd = useCallback(() => {
    if (isDraggingRef.current && draggedObjectNameRef.current) {
      isDraggingRef.current = false
      const objectName = draggedObjectNameRef.current
      draggedObjectNameRef.current = null
      // Commit the transformation to history
      useModellerStore.getState().commitToHistory(`Transform: ${objectName}`)
      logger.log("[Transform] Committed to history:", objectName)
    }
  }, [])

  // Ref to store the event handler for cleanup
  const handleDraggingChangedRef = useRef<((event: { value: boolean }) => void) | null>(null)

  // Callback ref to attach dragging-changed listener when TransformControls mounts
  const transformControlsRefCallback = useCallback(
    (controls: TransformControlsImpl | null) => {
      // Store ref for other uses
      if (transformControlsRef.current !== controls) {
        // Cleanup old listener if any
        if (transformControlsRef.current) {
          transformControlsRef.current.removeEventListener(
            "dragging-changed",
            handleDraggingChangedRef.current
          )
        }
        transformControlsRef.current = controls
      }

      if (!controls) return

      const handleDraggingChanged = (event: { value: boolean }) => {
        logger.log("[Transform] dragging-changed event:", event.value)

        // CRITICAL: Disable/enable OrbitControls based on transform gizmo drag state
        // This prevents camera movement while dragging the transform gizmo
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = !event.value
        }

        if (event.value) {
          handleTransformStart()
        } else {
          handleTransformEnd()
        }
      }

      // Store the handler for cleanup
      handleDraggingChangedRef.current = handleDraggingChanged

      controls.addEventListener("dragging-changed", handleDraggingChanged)
    },
    [handleTransformStart, handleTransformEnd]
  )

  // Handle transform change from gizmo
  const handleTransformChange = useCallback(() => {
    if (!selectedMeshRef.current || !firstSelectedObject) return

    const mesh = selectedMeshRef.current
    const position = mesh.position
    const rotation = mesh.rotation
    const scale = mesh.scale

    // Base transform update (for all object types)
    const updates: Partial<AnySceneObject> = {
      transform: {
        position: { x: position.x, y: position.y, z: position.z },
        rotation: {
          x: THREE.MathUtils.radToDeg(rotation.x),
          y: THREE.MathUtils.radToDeg(rotation.y),
          z: THREE.MathUtils.radToDeg(rotation.z),
        },
        scale: { x: scale.x, y: scale.y, z: scale.z },
      },
    }

    // For channels, also update hydraulic properties based on transform
    if (firstSelectedObject.type === "channel") {
      const channel = firstSelectedObject as ChannelObject

      // Y position in Three.js = elevation (Z in engineering)
      // Update startElevation when moving in Y
      ;(updates as Partial<ChannelObject>).startElevation = position.y

      // Calculate end elevation based on slope and length
      ;(updates as Partial<ChannelObject>).endElevation =
        position.y - channel.length * channel.slope

      // If scaling X (length direction), update length
      if (scale.x !== 1.0) {
        const newLength = channel.length * scale.x
        ;(updates as Partial<ChannelObject>).length = newLength
        ;(updates as Partial<ChannelObject>).endStation = channel.startStation + newLength
        ;(updates as Partial<ChannelObject>).endElevation = position.y - newLength * channel.slope
        // Reset scale to 1 since we've applied it to the length
        if (updates.transform?.scale) {
          updates.transform.scale.x = 1.0
        }
      }

      // If scaling Y (depth direction), update section depth
      if (scale.y !== 1.0) {
        const section = { ...channel.section }
        if ("depth" in section) {
          section.depth = section.depth * scale.y
        }
        ;(updates as Partial<ChannelObject>).section = section
        // Reset scale to 1 since we've applied it to the depth
        if (updates.transform?.scale) {
          updates.transform.scale.y = 1.0
        }
      }

      // If scaling Z (width direction), update section width
      if (scale.z !== 1.0) {
        const section = { ...channel.section }
        if (section.type === "rectangular" && "width" in section) {
          section.width = section.width * scale.z
        } else if (section.type === "trapezoidal" && "bottomWidth" in section) {
          section.bottomWidth = section.bottomWidth * scale.z
        }
        ;(updates as Partial<ChannelObject>).section = section
        // Reset scale to 1 since we've applied it to the width
        if (updates.transform?.scale) {
          updates.transform.scale.z = 1.0
        }
      }
    }

    // Update object in store (without saving to history on each change)
    updateObject(firstSelectedObject.id, updates)
  }, [firstSelectedObject, updateObject])

  // Callback to notify when mesh is mounted
  const handleMeshReady = useCallback(() => {
    // Set the mesh ready for the current selection
    if (_firstSelectedId) {
      setMeshReadyForId(_firstSelectedId)
    }
  }, [_firstSelectedId])

  // Convert store position to array for camera components with validation
  const safeVal = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback)
  const cameraPos: [number, number, number] = [
    safeVal(storeCameraPosition.x, 10),
    safeVal(storeCameraPosition.y, 10),
    safeVal(storeCameraPosition.z, 10),
  ]

  return (
    <>
      {/* Camera - key prop forces re-mount when switching projection type */}
      {isOrtho ? (
        <OrthographicCamera key="ortho" makeDefault position={cameraPos} zoom={50} />
      ) : (
        <PerspectiveCamera key="persp" makeDefault position={cameraPos} fov={50} />
      )}

      {/* Controls */}
      <OrbitControls
        ref={orbitControlsRef}
        makeDefault
        enabled={!isBoxSelectMode}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
        enableRotate={!isOrtho}
        onChange={() => invalidate()} // Invalidate on camera movement
      />

      {/* Environment & Lighting - Using HDRI-based lighting (PBR) */}
      {/* Environment provides both scene lighting and reflections from HDRI */}
      {/* All lighting is controlled via viewportSettings (preset + intensity) */}
      {viewportSettings.environmentEnabled && (
        <Environment
          preset={viewportSettings.environmentPreset ?? "apartment"}
          background={viewportSettings.environmentBackground ?? false}
          backgroundBlurriness={viewportSettings.backgroundBlurriness ?? 0.5}
          environmentIntensity={viewportSettings.environmentIntensity ?? 1}
        />
      )}

      {/* Fallback ambient light when environment is disabled */}
      {!viewportSettings.environmentEnabled && <ambientLight intensity={0.4} />}

      {/* Grid - Uses grid settings from store */}
      {viewportSettings.showGrid && (
        <Grid
          args={[gridSettings.size, gridSettings.size]}
          cellSize={gridSettings.snapSize ?? 1}
          cellThickness={0.5}
          cellColor="#404040"
          sectionSize={gridSettings.snapSize ? gridSettings.snapSize * 10 : 10}
          sectionThickness={1}
          sectionColor="#606060"
          fadeDistance={gridSettings.size / 2}
          fadeStrength={1}
          infiniteGrid
          position={[0, 0, 0]}
        />
      )}

      {/* Axes Helper */}
      {viewportSettings.showAxes && <axesHelper args={[5]} />}

      {/* Soft Shadows - Optimized and compatible */}
      {viewportSettings.shadows && (
        <ContactShadows
          position={[0, 0.005, 0]}
          opacity={0.5}
          scale={50}
          blur={2.5}
          far={20}
          resolution={512}
          color="#000000"
        />
      )}

      {/* Click handler for deselection */}
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleBackgroundClick}
        visible={false}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Main Scene - Permanent Objects (Layer 0, RenderOrder 0) */}
      <group name="main-scene" renderOrder={0}>
        {visibleObjects.map((object) => {
          const isSelected = selectedIds.includes(object.id)
          const isFirstSelected = firstSelectedObject?.id === object.id

          return (
            <SceneObjectMesh
              key={object.id}
              object={object}
              isSelected={isSelected}
              isHovered={hoveredId === object.id}
              viewMode={viewportSettings.viewMode}
              onSelect={handleSelect}
              onHover={handleHover}
              meshRef={isFirstSelected ? selectedMeshRef : undefined}
              onMeshReady={isFirstSelected ? handleMeshReady : undefined}
            />
          )
        })}
      </group>

      {/* Temporary Scene - Preview Objects (Layer 1, RenderOrder 1) */}
      {/* These objects are used for operation previews (boolean ops, transforms, etc.) */}
      <group name="temporary-scene" renderOrder={1}>
        {Array.from(temporaryObjects.values()).map((tempObj) => {
          if (!tempObj.object.visible) return null

          return (
            <SceneObjectMesh
              key={tempObj.id}
              object={tempObj.object}
              isSelected={false}
              isHovered={false}
              viewMode={viewportSettings.viewMode}
              onSelect={() => {}} // Temporary objects aren't selectable
              onHover={() => {}}
            />
          )
        })}
      </group>

      {/* Helpers Scene - Visual Aids (Layer 2, RenderOrder 2) */}
      {/* Grid, Axes, Gizmos, Measurements are rendered with higher priority */}
      <group name="helpers-scene" renderOrder={2}>
        {/* Helper objects will be rendered here in future implementations */}
        {/* For now, grid and axes are rendered separately below */}
      </group>

      {/* Transform Gizmo - attached to selected mesh */}
      {transformMode !== "none" && firstSelectedObject && meshReady && selectedMeshRef.current && (
        <TransformControls
          ref={transformControlsRefCallback}
          object={selectedMeshRef.current}
          mode={transformMode}
          space="world"
          size={0.75}
          translationSnap={
            snapMode === "grid" || gridSettings.snapEnabled ? gridSettings.snapSize : null
          }
          rotationSnap={
            snapMode === "grid" || gridSettings.snapEnabled ? THREE.MathUtils.degToRad(15) : null
          }
          scaleSnap={snapMode === "grid" || gridSettings.snapEnabled ? 0.1 : null}
          onObjectChange={handleTransformChange}
        />
      )}

      {/* Navigation Gizmo */}
      {(viewportSettings.showGizmo ?? true) && (
        <GizmoHelper alignment="bottom-right" margin={[60, 60]} renderPriority={2}>
          <GizmoViewport
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="white"
            font="500 14px Inter, system-ui, sans-serif"
            axisHeadScale={1}
          />
        </GizmoHelper>
      )}

      {/* Performance Stats */}
      {showStats && <Stats />}

      {/* Post-Processing Effects */}
      {(viewportSettings.enablePostProcessing ?? false) && (
        <PostProcessing
          quality={(viewportSettings.postProcessingQuality ?? "medium") as QualityPreset}
          enableSSAO={viewportSettings.ambientOcclusion ?? false}
          enableBloom
          enableAA={viewportSettings.antialiasing ?? true}
        />
      )}
    </>
  )
}

export default SceneContent
