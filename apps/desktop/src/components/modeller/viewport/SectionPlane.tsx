/**
 * SectionPlane Component - CADHY
 *
 * Interactive clipping plane for CAD section views.
 * Allows users to cut through geometry to see internal structures.
 *
 * Features:
 * - Interactive plane positioning
 * - Visual plane indicator
 * - Multiple plane support (future)
 */

import { useThree } from "@react-three/fiber"
import { memo, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { useViewportSettings } from "@/stores/modeller"

// ============================================================================
// TYPES
// ============================================================================

export interface SectionPlaneProps {
  /** Enable/disable the section plane */
  enabled?: boolean
  /** Plane position */
  position?: { x: number; y: number; z: number }
  /** Plane normal direction */
  normal?: { x: number; y: number; z: number }
  /** Color of the section indicator */
  capColor?: string
  /** Show the plane visual indicator */
  showPlaneIndicator?: boolean
  /** Plane indicator size */
  planeSize?: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SectionPlane = memo(function SectionPlane({
  enabled = false,
  position = { x: 0, y: 0, z: 0 },
  normal = { x: 0, y: 1, z: 0 },
  capColor = "#ff6b6b",
  showPlaneIndicator = true,
  planeSize = 20,
}: SectionPlaneProps) {
  const { gl, scene } = useThree()
  const planeRef = useRef<THREE.Plane | null>(null)

  // Create the clipping plane
  const clippingPlane = useMemo(() => {
    const normalVec = new THREE.Vector3(normal.x, normal.y, normal.z).normalize()
    const posVec = new THREE.Vector3(position.x, position.y, position.z)
    // Plane constant is the negative dot product of normal and position
    const constant = -normalVec.dot(posVec)
    return new THREE.Plane(normalVec, constant)
  }, [position.x, position.y, position.z, normal.x, normal.y, normal.z])

  // Store plane reference
  planeRef.current = clippingPlane

  // Update clipping planes on renderer
  useEffect(() => {
    if (enabled) {
      // Enable local clipping
      gl.localClippingEnabled = true
      gl.clippingPlanes = [clippingPlane]
    } else {
      // Disable clipping
      gl.localClippingEnabled = false
      gl.clippingPlanes = []
    }

    return () => {
      gl.localClippingEnabled = false
      gl.clippingPlanes = []
    }
  }, [enabled, clippingPlane, gl])

  // Update materials in scene to use clipping
  useEffect(() => {
    if (!enabled) return

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((mat) => {
          if (mat instanceof THREE.Material) {
            mat.clippingPlanes = [clippingPlane]
            mat.clipShadows = true
            mat.needsUpdate = true
          }
        })
      }
    })

    return () => {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((mat) => {
            if (mat instanceof THREE.Material) {
              mat.clippingPlanes = []
              mat.clipShadows = false
              mat.needsUpdate = true
            }
          })
        }
      })
    }
  }, [enabled, clippingPlane, scene])

  // Calculate plane rotation from normal
  const planeRotation = useMemo(() => {
    const normalVec = new THREE.Vector3(normal.x, normal.y, normal.z).normalize()
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVec)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    return [euler.x, euler.y, euler.z] as [number, number, number]
  }, [normal.x, normal.y, normal.z])

  if (!enabled) return null

  return (
    <>
      {/* Visual plane indicator */}
      {showPlaneIndicator && (
        <mesh
          position={[position.x, position.y, position.z]}
          rotation={planeRotation}
          renderOrder={1000}
        >
          <planeGeometry args={[planeSize, planeSize]} />
          <meshBasicMaterial
            color={capColor}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Edge outline for the section plane */}
      {showPlaneIndicator && (
        <lineSegments
          position={[position.x, position.y, position.z]}
          rotation={planeRotation}
          renderOrder={1001}
        >
          <edgesGeometry args={[new THREE.PlaneGeometry(planeSize, planeSize)]} />
          <lineBasicMaterial color={capColor} linewidth={2} />
        </lineSegments>
      )}
    </>
  )
})

// ============================================================================
// SECTION PLANE WRAPPER (connects to viewport settings)
// ============================================================================

/**
 * AutoSectionPlane - Automatically reads settings from viewport store
 */
export const AutoSectionPlane = memo(function AutoSectionPlane() {
  const viewportSettings = useViewportSettings()

  if (!viewportSettings.enableSectionPlane) {
    return null
  }

  return (
    <SectionPlane
      enabled={viewportSettings.enableSectionPlane}
      position={viewportSettings.sectionPlanePosition}
      normal={viewportSettings.sectionPlaneNormal}
      showPlaneIndicator={true}
      capColor="#ff6b6b"
    />
  )
})

export default SectionPlane
