/**
 * SceneObjectMesh Component
 *
 * Router component that renders the appropriate mesh for each scene object type.
 * Handles selection, hover states, and view modes.
 */

import type { ThreeEvent } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type {
  AnySceneObject,
  ChannelObject,
  ChuteObject,
  ShapeObject,
  TransitionObject,
} from "@/stores/modeller-store"
import { ChannelMesh } from "./ChannelMesh"
import { ChuteMesh } from "./ChuteMesh"
import { TransitionMesh } from "./TransitionMesh"

export interface SceneObjectMeshProps {
  object: AnySceneObject
  isSelected: boolean
  isHovered: boolean
  viewMode: "solid" | "wireframe" | "xray" | "hidden-line"
  onSelect: (id: string, additive: boolean) => void
  onHover: (id: string | null) => void
  meshRef?: React.RefObject<THREE.Mesh | THREE.Group | null>
  onMeshReady?: () => void
}

export function SceneObjectMesh({
  object,
  isSelected,
  isHovered,
  viewMode,
  onSelect,
  onHover,
  meshRef: externalMeshRef,
  onMeshReady,
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
  }, [object])

  // Determine opacity
  const opacity = useMemo(() => {
    if (viewMode === "xray") return 0.5
    if (object.type === "shape") {
      return (object as ShapeObject).material?.opacity ?? 1
    }
    return 1
  }, [object, viewMode])

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

  // Event handlers
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation()
      onSelect(object.id, event.nativeEvent.shiftKey)
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
      />
    )
  }

  // Extract shape parameters for dependency tracking
  // Serialize params to JSON string to ensure useMemo detects changes in nested objects
  const _shapeParamsKey =
    object.type === "shape" ? JSON.stringify((object as ShapeObject).parameters) : null
  const _shapeType = object.type === "shape" ? (object as ShapeObject).shapeType : null
  const _shapeMeshKey =
    object.type === "shape" && (object as ShapeObject).mesh
      ? ((object as ShapeObject).mesh?.vertices?.length ?? 0)
      : null

  // Create geometry for shape objects
  // Prioritize mesh data from backend (OpenCASCADE) if available
  const geometry = useMemo(() => {
    if (object.type === "shape") {
      const shapeObj = object as ShapeObject

      // If we have mesh data from the CAD backend, use it
      if (shapeObj.mesh?.vertices && shapeObj.mesh.vertices.length > 0) {
        const geo = new THREE.BufferGeometry()

        // Set vertices - swap Y and Z for Three.js coordinate system
        const positions = new Float32Array(shapeObj.mesh.vertices.length)
        for (let i = 0; i < shapeObj.mesh.vertices.length; i += 3) {
          const x = shapeObj.mesh.vertices[i] // X stays X
          const y = shapeObj.mesh.vertices[i + 1] // Backend Y (transverse)
          const z = shapeObj.mesh.vertices[i + 2] // Backend Z (vertical/up)

          positions[i] = x // Three.js X
          positions[i + 1] = z // Three.js Y = Backend Z
          positions[i + 2] = -y // Three.js Z = -Backend Y
        }
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))

        // Set indices
        if (shapeObj.mesh.indices && shapeObj.mesh.indices.length > 0) {
          geo.setIndex(shapeObj.mesh.indices)
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

        geo.computeBoundingBox()
        geo.computeBoundingSphere()

        return geo
      }

      // Fallback: create simple Three.js geometry based on shape type
      const params = shapeObj.parameters
      // Get segments from params or use default (32 for smooth, 8 for low-poly)
      const segments = params.segments ?? 32

      switch (shapeObj.shapeType) {
        case "box":
          return new THREE.BoxGeometry(
            params.width ?? 1,
            params.height ?? 1,
            params.depth ?? 1,
            segments, // widthSegments
            segments, // heightSegments
            segments // depthSegments
          )
        case "cylinder":
          return new THREE.CylinderGeometry(
            params.radius ?? 0.5,
            params.radius ?? 0.5,
            params.height ?? 1,
            segments, // radialSegments
            Math.max(1, Math.floor(segments / 8)) // heightSegments
          )
        case "sphere":
          return new THREE.SphereGeometry(
            params.radius ?? 0.5,
            segments, // widthSegments
            Math.max(8, Math.floor(segments / 2)) // heightSegments
          )
        case "cone":
          return new THREE.ConeGeometry(
            params.bottomRadius ?? 0.5,
            params.height ?? 1,
            segments, // radialSegments
            Math.max(1, Math.floor(segments / 8)) // heightSegments
          )
        case "torus":
          return new THREE.TorusGeometry(
            params.majorRadius ?? 1,
            params.minorRadius ?? 0.3,
            Math.max(8, Math.floor(segments / 2)), // tubularSegments (around the tube)
            segments // radialSegments (around the torus)
          )
        default:
          return new THREE.BoxGeometry(1, 1, 1)
      }
    }

    // Default geometry for other types
    return new THREE.BoxGeometry(1, 1, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.id, object.type, object])

  return (
    <mesh
      ref={internalMeshRef}
      geometry={geometry}
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
      <meshStandardMaterial
        color={isHovered ? "#3b82f6" : color}
        wireframe={viewMode === "wireframe"}
        transparent={opacity < 1 || viewMode === "xray"}
        opacity={opacity}
        side={THREE.DoubleSide}
        metalness={materialProps.metalness}
        roughness={materialProps.roughness}
      />
      {/* Selection outline */}
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#22c55e" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  )
}

export default SceneObjectMesh
