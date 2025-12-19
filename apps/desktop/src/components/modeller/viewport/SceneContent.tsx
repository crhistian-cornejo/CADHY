/**
 * SceneContent Component
 *
 * Contains all 3D scene elements: camera, controls, lighting, grid, objects,
 * transform gizmos, and navigation helpers.
 */

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
import {
  type AnySceneObject,
  type ChannelObject,
  type ShapeObject,
  useCameraView,
  useFocusObjectId,
  useGridSettings,
  useModellerStore,
  useSelectedIds,
  useSelectedObjects,
  useSnapMode,
  useTransformMode,
  useViewportSettings,
  useVisibleObjects,
} from "@/stores/modeller-store"
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
  const cameraView = useCameraView()
  const viewportSettings = useViewportSettings()
  const gridSettings = useGridSettings()
  const snapMode = useSnapMode()
  const hoveredId = useModellerStore((s) => s.hoveredId)
  const updateObject = useModellerStore((s) => s.updateObject)
  const focusObjectId = useFocusObjectId()
  const clearFocus = useModellerStore((s) => s.clearFocus)
  const getObjectById = useModellerStore((s) => s.getObjectById)

  // Camera position and target from store
  const storeCameraPosition = useModellerStore((s) => s.cameraPosition)
  const storeCameraTarget = useModellerStore((s) => s.cameraTarget)

  const { select, setHovered } = useModellerStore()

  // Ref for the currently selected mesh (first selected)
  const selectedMeshRef = useRef<THREE.Mesh | THREE.Group>(null)
  const transformControlsRef = useRef<any>(null)
  const orbitControlsRef = useRef<any>(null)

  // Animation state for camera focus
  const focusAnimationRef = useRef<{
    active: boolean
    startTarget: THREE.Vector3
    endTarget: THREE.Vector3
    startPosition: THREE.Vector3
    endPosition: THREE.Vector3
    progress: number
  } | null>(null)

  // Get camera from Three.js context
  const { camera } = useThree()

  // State to trigger re-render when mesh is ready
  const [meshReady, setMeshReady] = useState(false)

  // Get the first selected object for transform
  const firstSelectedObject = selectedObjects.length > 0 ? selectedObjects[0] : null
  const _firstSelectedId = firstSelectedObject?.id

  // Reset meshReady when selection changes
  useEffect(() => {
    setMeshReady(false)
    // Check if mesh is already available on next frame
    requestAnimationFrame(() => {
      if (selectedMeshRef.current) {
        setMeshReady(true)
      }
    })
  }, [])

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

  // Animate camera focus
  useFrame((_, delta) => {
    if (!focusAnimationRef.current?.active || !orbitControlsRef.current) return

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

  // Camera settings based on view
  const isOrtho = cameraView !== "perspective"

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
      console.log("[Transform] Started drag on:", firstSelectedObject.name)
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
      console.log("[Transform] Committed to history:", objectName)
    }
  }, [])

  // Ref to store the event handler for cleanup
  const handleDraggingChangedRef = useRef<((event: { value: boolean }) => void) | null>(null)

  // Callback ref to attach dragging-changed listener when TransformControls mounts
  const transformControlsRefCallback = useCallback(
    (controls: any) => {
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
        console.log("[Transform] dragging-changed event:", event.value)
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
    setMeshReady(true)
  }, [])

  // Convert store position to array for camera components with validation
  const safeVal = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback)
  const cameraPos: [number, number, number] = [
    safeVal(storeCameraPosition.x, 10),
    safeVal(storeCameraPosition.y, 10),
    safeVal(storeCameraPosition.z, 10),
  ]

  return (
    <>
      {/* Camera */}
      {isOrtho ? (
        <OrthographicCamera makeDefault position={cameraPos} zoom={50} />
      ) : (
        <PerspectiveCamera makeDefault position={cameraPos} fov={50} />
      )}

      {/* Controls */}
      <OrbitControls
        ref={orbitControlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
        enableRotate={!isOrtho}
      />

      {/* Environment & Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow={viewportSettings.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {/* Environment map for reflections - lightweight preset */}
      <Environment preset="sunset" />

      {/* Grid */}
      {viewportSettings.showGrid && (
        <Grid
          args={[gridSettings.size, gridSettings.size]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#404040"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#606060"
          fadeDistance={50}
          fadeStrength={1}
          infiniteGrid
          position={[0, 0, 0]}
        />
      )}

      {/* Axes Helper */}
      {viewportSettings.showAxes && <axesHelper args={[5]} />}

      {/* Contact Shadows - Optimized */}
      {viewportSettings.shadows && visibleObjects.length < 20 && (
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.3}
          scale={20}
          blur={1.5}
          far={10}
          resolution={256}
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

      {/* Scene Objects */}
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

      {/* Transform Gizmo - attached to selected mesh */}
      {transformMode !== "none" && firstSelectedObject && meshReady && selectedMeshRef.current && (
        <TransformControls
          ref={transformControlsRefCallback}
          object={selectedMeshRef.current}
          mode={transformMode}
          space="world"
          size={0.75}
          translationSnap={snapMode === "grid" ? gridSettings.snapSize : null}
          rotationSnap={snapMode === "grid" ? THREE.MathUtils.degToRad(15) : null}
          scaleSnap={snapMode === "grid" ? 0.1 : null}
          onObjectChange={handleTransformChange}
        />
      )}

      {/* Navigation Gizmo */}
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={["#ef4444", "#22c55e", "#3b82f6"]} labelColor="white" />
      </GizmoHelper>

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
