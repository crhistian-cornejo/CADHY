/**
 * SceneObjectMesh Component
 *
 * Router component that renders the appropriate mesh for each scene object type.
 * Handles selection, hover states, and view modes.
 */

import { loggers } from "@cadhy/shared"
import type { ThreeEvent } from "@react-three/fiber"
import React, { useCallback, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { type PBRTextureMaps, usePBRTextures } from "@/hooks/use-pbr-textures"
import { ensureBVH } from "@/lib/bvh-setup"
import { meshCache } from "@/services/mesh-cache"

import type {
  AnySceneObject,
  ChannelObject,
  ChuteObject,
  ShapeObject,
  TransitionObject,
} from "@/stores/modeller"
import { useViewportSettings } from "@/stores/modeller"
import { generateBoxProjectionUVs } from "../geometry-utils"
import { ChannelMesh } from "./ChannelMesh"
import { ChuteMesh } from "./ChuteMesh"
import { TransitionMesh } from "./TransitionMesh"

const log = loggers.mesh

export interface SceneObjectMeshProps {
  object: AnySceneObject
  isSelected: boolean
  isHovered: boolean
  viewMode: "solid" | "wireframe" | "xray" | "hidden-line"
  onSelect: (id: string, additive: boolean) => void
  onHover: (id: string | null) => void
  meshRef?: React.RefObject<THREE.Mesh | THREE.Group | null>
  onMeshReady?: () => void
  /** If true, render as ghost preview (green transparent) */
  isGhostPreview?: boolean
}

export const SceneObjectMesh = React.memo(function SceneObjectMesh({
  object,
  isSelected,
  isHovered,
  viewMode,
  onSelect,
  onHover,
  meshRef: externalMeshRef,
  onMeshReady,
  isGhostPreview = false,
}: SceneObjectMeshProps) {
  const internalMeshRef = useRef<THREE.Mesh>(null)

  // Sync external ref with internal ref and notify when ready
  useEffect(() => {
    if (externalMeshRef && internalMeshRef.current) {
      ;(externalMeshRef as React.MutableRefObject<THREE.Mesh | null>).current =
        internalMeshRef.current
      onMeshReady?.()
    }
    return () => {
      if (externalMeshRef) {
        ;(externalMeshRef as React.MutableRefObject<THREE.Mesh | null>).current = null
      }
    }
  }, [externalMeshRef, onMeshReady])

  // Determine color based on state - keep original color, use outline for selection
  const color = useMemo(() => {
    // Ghost preview: always green
    if (isGhostPreview) {
      return "#10b981" // Green for preview
    }
    if (isSelected) {
      return "#f59e0b" // Amber/Orange for selection (more CAD-like)
    }
    if (object.type === "shape") {
      return (object as ShapeObject).material?.color ?? "#6366f1"
    }
    if (object.type === "channel") {
      return (object as ChannelObject).material?.color ?? "#0ea5e9"
    }
    if (object.type === "transition") {
      return (object as TransitionObject).material?.color ?? "#22c55e"
    }
    if (object.type === "chute") {
      return (object as ChuteObject).material?.color ?? "#f59e0b"
    }
    return "#6366f1"
  }, [object, isGhostPreview])

  // Determine opacity
  const opacity = useMemo(() => {
    // Ghost preview: semi-transparent
    if (isGhostPreview) {
      return 0.3
    }
    if (viewMode === "xray") return 0.5
    if (object.type === "shape") {
      return (object as ShapeObject).material?.opacity ?? 1
    }
    return 1
  }, [object, viewMode, isGhostPreview])

  // Get material properties
  const materialProps = useMemo(() => {
    if (object.type === "shape") {
      const shape = object as ShapeObject
      return {
        metalness: shape.material?.metalness ?? 0.1,
        roughness: shape.material?.roughness ?? 0.6,
      }
    }
    return { metalness: 0.1, roughness: 0.6 }
  }, [object])

  // Load PBR textures (only for shapes with post-processing enabled)
  const viewportSettings = useViewportSettings()
  const shapeMaterial = object.type === "shape" ? (object as ShapeObject).material : undefined
  const pbrTextures = usePBRTextures(shapeMaterial, viewportSettings.enablePostProcessing ?? false)

  // UV repeat from material
  const uvRepeat = useMemo(() => {
    if (object.type === "shape") {
      const shape = object as ShapeObject
      return {
        x: shape.material?.pbr?.repeatX ?? 1,
        y: shape.material?.pbr?.repeatY ?? 1,
      }
    }
    return { x: 1, y: 1 }
  }, [object])

  // Store texture reference to update UV repeat without re-render
  const texturesRef = useRef<PBRTextureMaps | null>(null)
  texturesRef.current = pbrTextures

  // Apply UV repeat to textures when they first load
  useEffect(() => {
    if (pbrTextures) {
      log.log("Applying textures:", Object.keys(pbrTextures), "UV repeat:", uvRepeat)
      Object.values(pbrTextures).forEach((texture) => {
        if (texture) {
          texture.repeat.set(uvRepeat.x, uvRepeat.y)
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.needsUpdate = true
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pbrTextures, uvRepeat])

  // Update UV repeat on slider change (without re-rendering geometry)
  useEffect(() => {
    if (texturesRef.current) {
      Object.values(texturesRef.current).forEach((texture) => {
        if (texture) {
          texture.repeat.set(uvRepeat.x, uvRepeat.y)
        }
      })
    }
  }, [uvRepeat.x, uvRepeat.y])

  // Event handlers
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      // Use Ctrl/Cmd for additive selection (Shift is reserved for box selection)
      const additive = event.nativeEvent.ctrlKey || event.nativeEvent.metaKey
      onSelect(object.id, additive)
    },
    [object.id, onSelect]
  )

  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      onHover(object.id)
      document.body.style.cursor = "pointer"
    },
    [object.id, onHover]
  )

  const handlePointerOut = useCallback(() => {
    onHover(null)
    document.body.style.cursor = "auto"
  }, [onHover])

  // Cleanup geometry reference when component unmounts
  useEffect(() => {
    return () => {
      // Release geometry from cache when shape is removed
      if (object.type === "shape") {
        const shapeObj = object as ShapeObject
        const params = shapeObj.parameters
        const segments = params.segments ?? 32

        switch (shapeObj.shapeType) {
          case "box":
            meshCache.releaseGeometry("box", {
              width: params.width ?? 1,
              height: params.height ?? 1,
              depth: params.depth ?? 1,
              segments,
            })
            break
          case "cylinder":
            meshCache.releaseGeometry("cylinder", {
              radius: params.radius ?? 0.5,
              height: params.height ?? 1,
              segments,
            })
            break
          case "sphere":
            meshCache.releaseGeometry("sphere", { radius: params.radius ?? 0.5, segments })
            break
          case "cone":
            meshCache.releaseGeometry("cone", {
              radius: params.bottomRadius ?? 0.5,
              height: params.height ?? 1,
              segments,
            })
            break
          case "torus":
            meshCache.releaseGeometry("torus", {
              majorRadius: params.majorRadius ?? 1,
              minorRadius: params.minorRadius ?? 0.3,
              segments,
            })
            break
          default:
            meshCache.releaseGeometry("box", { width: 1, height: 1, depth: 1, segments: 1 })
        }
      }
    }
  }, [object])

  // Load PBR textures for ALL object types (must be called unconditionally for React hooks rules)
  // Get material from any object type
  const objectMaterial = useMemo(() => {
    if (object.type === "channel") return (object as ChannelObject).material
    if (object.type === "transition") return (object as TransitionObject).material
    if (object.type === "chute") return (object as ChuteObject).material
    if (object.type === "shape") return (object as ShapeObject).material
    return undefined
  }, [object])

  // This hook is ALWAYS called (React hooks rule: hooks must be called in same order every render)
  const objectTextures = usePBRTextures(
    objectMaterial,
    viewportSettings.enablePostProcessing ?? false
  )

  // UV repeat from material (unconditional)
  const objectUvRepeat = useMemo(() => {
    return {
      x: objectMaterial?.pbr?.repeatX ?? 1,
      y: objectMaterial?.pbr?.repeatY ?? 1,
    }
  }, [objectMaterial])

  if (!object.visible) return null

  // Use ChannelMesh for channel objects
  if (object.type === "channel") {
    const channelObj = object as ChannelObject
    return (
      <ChannelMesh
        channel={channelObj}
        color={color}
        opacity={opacity}
        metalness={channelObj.material?.metalness ?? 0.1}
        roughness={channelObj.material?.roughness ?? 0.6}
        wireframe={viewMode === "wireframe"}
        isSelected={isSelected}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        meshRef={externalMeshRef}
        onMeshReady={onMeshReady}
        pbrTextures={objectTextures}
        uvRepeat={objectUvRepeat}
      />
    )
  }

  // Use TransitionMesh for transition objects
  if (object.type === "transition") {
    const transitionObj = object as TransitionObject
    return (
      <TransitionMesh
        transition={transitionObj}
        color={color}
        opacity={opacity}
        metalness={transitionObj.material?.metalness ?? 0.1}
        roughness={transitionObj.material?.roughness ?? 0.6}
        wireframe={viewMode === "wireframe"}
        isSelected={isSelected}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        meshRef={externalMeshRef}
        onMeshReady={onMeshReady}
        pbrTextures={objectTextures}
        uvRepeat={objectUvRepeat}
      />
    )
  }

  // Use ChuteMesh for chute objects
  if (object.type === "chute") {
    const chuteObj = object as ChuteObject
    return (
      <ChuteMesh
        chute={chuteObj}
        color={color}
        opacity={opacity}
        metalness={chuteObj.material?.metalness ?? 0.1}
        roughness={chuteObj.material?.roughness ?? 0.6}
        wireframe={viewMode === "wireframe"}
        isSelected={isSelected}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        meshRef={externalMeshRef}
        onMeshReady={onMeshReady}
        pbrTextures={objectTextures}
        uvRepeat={objectUvRepeat}
      />
    )
  }

  // Create geometry for shape objects with caching
  // Prioritize mesh data from backend (OpenCASCADE) if available
  const geometry = useMemo(() => {
    if (object.type === "shape") {
      const shapeObj = object as ShapeObject

      // For basic primitives, ALWAYS use Three.js geometry for display (instant feedback)
      // Backend mesh is only used for complex shapes (boolean results, imports, etc.)
      // This gives smooth slider interaction while keeping backend synced for CAD operations
      const isBasicPrimitive = ["box", "cylinder", "sphere", "cone", "torus"].includes(
        shapeObj.shapeType
      )

      // Use backend mesh ONLY for non-primitive shapes (boolean results, complex geometry)
      if (shapeObj.mesh?.vertices && shapeObj.mesh.vertices.length > 0 && !isBasicPrimitive) {
        const geo = new THREE.BufferGeometry()

        // Set vertices - swap Y and Z for Three.js coordinate system
        const positions = new Float32Array(shapeObj.mesh.vertices.length)

        // First pass: transform coordinates and find bounding box
        let minX = Infinity,
          minY = Infinity,
          minZ = Infinity
        let maxX = -Infinity,
          maxY = -Infinity,
          maxZ = -Infinity

        for (let i = 0; i < shapeObj.mesh.vertices.length; i += 3) {
          const x = shapeObj.mesh.vertices[i] // X stays X
          const y = shapeObj.mesh.vertices[i + 1] // Backend Y (transverse)
          const z = shapeObj.mesh.vertices[i + 2] // Backend Z (vertical/up)

          // Transform to Three.js coordinates
          const tx = x // Three.js X
          const ty = z // Three.js Y = Backend Z
          const tz = -y // Three.js Z = -Backend Y

          positions[i] = tx
          positions[i + 1] = ty
          positions[i + 2] = tz

          // Track bounding box
          minX = Math.min(minX, tx)
          minY = Math.min(minY, ty)
          minZ = Math.min(minZ, tz)
          maxX = Math.max(maxX, tx)
          maxY = Math.max(maxY, ty)
          maxZ = Math.max(maxZ, tz)
        }

        // Second pass: center the geometry (OpenCASCADE creates shapes from origin, Three.js centers them)
        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2
        const centerZ = (minZ + maxZ) / 2

        for (let i = 0; i < positions.length; i += 3) {
          positions[i] -= centerX
          positions[i + 1] -= centerY
          positions[i + 2] -= centerZ
        }

        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))

        // Set indices
        if (shapeObj.mesh.indices && shapeObj.mesh.indices.length > 0) {
          geo.setIndex(Array.from(shapeObj.mesh.indices))
        }

        // Set normals if available, otherwise compute them
        if (shapeObj.mesh.normals && shapeObj.mesh.normals.length > 0) {
          const normals = new Float32Array(shapeObj.mesh.normals.length)
          for (let i = 0; i < shapeObj.mesh.normals.length; i += 3) {
            const nx = shapeObj.mesh.normals[i]
            const ny = shapeObj.mesh.normals[i + 1]
            const nz = shapeObj.mesh.normals[i + 2]

            normals[i] = nx
            normals[i + 1] = nz
            normals[i + 2] = -ny
          }
          geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3))
        } else {
          geo.computeVertexNormals()
        }

        // Generate UV coordinates using box projection for proper texture mapping
        generateBoxProjectionUVs(geo, 1.0)

        geo.computeBoundingBox()
        geo.computeBoundingSphere()

        // Compute BVH for accelerated raycasting (10-100x faster selection)
        ensureBVH(geo)

        return geo
      }

      // Create Three.js geometry based on shape type
      // This is used either as fallback (no backend mesh) or when we want visual subdivisions
      const params = shapeObj.parameters
      // Default segments: 1 for boxes (subdivisions), 32 for curved primitives (tessellation detail)
      const defaultSegments = shapeObj.shapeType === "box" ? 1 : 32
      const segments = params.segments ?? defaultSegments

      switch (shapeObj.shapeType) {
        case "box":
          return meshCache.getGeometry(
            "box",
            {
              width: params.width ?? 1,
              height: params.height ?? 1,
              depth: params.depth ?? 1,
              segments,
            },
            () =>
              new THREE.BoxGeometry(
                params.width ?? 1,
                params.height ?? 1,
                params.depth ?? 1,
                segments,
                segments,
                segments
              )
          )
        case "cylinder":
          return meshCache.getGeometry(
            "cylinder",
            { radius: params.radius ?? 0.5, height: params.height ?? 1, segments },
            () =>
              new THREE.CylinderGeometry(
                params.radius ?? 0.5,
                params.radius ?? 0.5,
                params.height ?? 1,
                segments,
                Math.max(1, Math.floor(segments / 8))
              )
          )
        case "sphere":
          return meshCache.getGeometry(
            "sphere",
            { radius: params.radius ?? 0.5, segments },
            () =>
              new THREE.SphereGeometry(
                params.radius ?? 0.5,
                segments,
                Math.max(8, Math.floor(segments / 2))
              )
          )
        case "cone":
          return meshCache.getGeometry(
            "cone",
            { radius: params.bottomRadius ?? 0.5, height: params.height ?? 1, segments },
            () =>
              new THREE.ConeGeometry(
                params.bottomRadius ?? 0.5,
                params.height ?? 1,
                segments,
                Math.max(1, Math.floor(segments / 8))
              )
          )
        case "torus":
          return meshCache.getGeometry(
            "torus",
            {
              majorRadius: params.majorRadius ?? 1,
              minorRadius: params.minorRadius ?? 0.3,
              segments,
            },
            () =>
              new THREE.TorusGeometry(
                params.majorRadius ?? 1,
                params.minorRadius ?? 0.3,
                Math.max(8, Math.floor(segments / 2)),
                segments
              )
          )
        default:
          return meshCache.getGeometry(
            "box",
            { width: 1, height: 1, depth: 1, segments: 1 },
            () => new THREE.BoxGeometry(1, 1, 1)
          )
      }
    }

    // Default geometry for other types (cached)
    return meshCache.getGeometry(
      "box",
      { width: 1, height: 1, depth: 1, segments: 1 },
      () => new THREE.BoxGeometry(1, 1, 1)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    object.id,
    object.type,
    // Include shape-specific properties to detect changes in history preview
    object.type === "shape" ? (object as ShapeObject).shapeType : null,
    object.type === "shape" ? JSON.stringify((object as ShapeObject).parameters) : null,
    object.type === "shape" && (object as ShapeObject).mesh
      ? ((object as ShapeObject).mesh?.vertices?.length ?? 0)
      : null,
  ])

  // Cleanup geometry on unmount if it's not from cache
  useEffect(() => {
    return () => {
      if (object.type === "shape") {
        const shapeObj = object as ShapeObject
        if (shapeObj.mesh?.vertices && shapeObj.mesh.vertices.length > 0) {
          geometry.dispose()
        }
      }
    }
  }, [geometry, object])

  return (
    <mesh
      ref={internalMeshRef}
      geometry={geometry}
      castShadow={viewportSettings.shadows}
      receiveShadow={viewportSettings.shadows}
      position={[
        object.transform.position.x,
        object.transform.position.y,
        object.transform.position.z,
      ]}
      rotation={[
        THREE.MathUtils.degToRad(object.transform.rotation.x),
        THREE.MathUtils.degToRad(object.transform.rotation.y),
        THREE.MathUtils.degToRad(object.transform.rotation.z),
      ]}
      scale={[object.transform.scale.x, object.transform.scale.y, object.transform.scale.z]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {viewportSettings.enablePostProcessing ? (
        <meshStandardMaterial
          key={`mat-pbr-${pbrTextures?.albedo?.uuid ?? "none"}`}
          color={
            isGhostPreview
              ? "#10b981" // Ghost preview: green
              : isSelected
                ? "#10b981" // Selected: green
                : isHovered
                  ? "#3b82f6" // Hovered: blue
                  : pbrTextures?.albedo
                    ? "#ffffff"
                    : color
          }
          wireframe={viewMode === "wireframe" || isGhostPreview}
          transparent={opacity < 1 || viewMode === "xray" || isGhostPreview}
          opacity={opacity}
          side={THREE.FrontSide}
          metalness={Math.min(
            1,
            materialProps.metalness + (viewportSettings.reflection ?? 0) * 0.5
          )}
          roughness={Math.max(
            0,
            materialProps.roughness - (viewportSettings.reflection ?? 0) * 0.3
          )}
          // Selection glow effect - emissive for selected objects
          emissive={
            isGhostPreview ? "#10b981" : isSelected ? "#10b981" : isHovered ? "#3b82f6" : "#000000"
          }
          emissiveIntensity={isGhostPreview ? 0.2 : isSelected ? 0.3 : isHovered ? 0.15 : 0}
          map={pbrTextures?.albedo ?? null}
          normalMap={pbrTextures?.normal ?? null}
          roughnessMap={pbrTextures?.roughness ?? null}
          metalnessMap={pbrTextures?.metalness ?? null}
          aoMap={pbrTextures?.ao ?? null}
          aoMapIntensity={pbrTextures?.ao ? 1 : 0}
          // Prevent overexposure from environment lighting when using textures
          // Increase envMapIntensity based on reflection setting
          envMapIntensity={
            pbrTextures?.albedo
              ? 0.5 + (viewportSettings.reflection ?? 0) * 0.5
              : 1 + (viewportSettings.reflection ?? 0) * 0.5
          }
        />
      ) : (
        <meshBasicMaterial
          key="mat-basic"
          color={
            isGhostPreview ? "#10b981" : isSelected ? "#f59e0b" : isHovered ? "#3b82f6" : color
          }
          wireframe={viewMode === "wireframe" || isGhostPreview}
          transparent={opacity < 1 || viewMode === "xray" || isGhostPreview}
          opacity={opacity}
          side={THREE.FrontSide}
        />
      )}
    </mesh>
  )
})

export default SceneObjectMesh
