/**
 * TransitionMesh Component
 *
 * Renders a hydraulic transition with Rust-generated geometry.
 * Transitions connect channels with different cross-sections.
 * Supports optional stilling basin for drop transitions.
 */

import type { ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  generateTransitionMesh,
  isTauriAvailable,
  type TransitionGeometryInput,
} from "@/services/hydraulics-service"
import type { StillingBasinConfig, TransitionObject } from "@/stores/modeller-store"
import { mergeBufferGeometries, meshResultToBufferGeometry, safeNumber } from "../geometry-utils"

export interface TransitionMeshProps {
  transition: TransitionObject
  color: string
  opacity: number
  metalness: number
  roughness: number
  wireframe: boolean
  isSelected: boolean
  onClick: (event: ThreeEvent<MouseEvent>) => void
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void
  onPointerOut: () => void
  meshRef?: React.RefObject<THREE.Mesh | THREE.Group | null>
  onMeshReady?: () => void
}

/**
 * Create stilling basin geometry for drop transitions
 * Basin is positioned at the outlet end of the transition
 */
function createStillingBasinGeometry(
  basin: StillingBasinConfig,
  outletWidth: number,
  outletDepth: number,
  transitionLength: number,
  endElevation: number,
  thickness: number
): THREE.BufferGeometry | null {
  if (basin.type === "none") return null

  const geometries: THREE.BufferGeometry[] = []
  const basinLength = safeNumber(basin.length, 5)
  const basinDepth = safeNumber(basin.depth, 1)
  const width = safeNumber(outletWidth, 2)
  const wallThickness = safeNumber(thickness, 0.15)

  // Basin floor (depressed below transition outlet)
  const basinFloor = new THREE.BoxGeometry(basinLength, wallThickness, width + 2 * wallThickness)
  basinFloor.translate(
    transitionLength + basinLength / 2,
    endElevation - basinDepth - wallThickness / 2,
    0
  )
  geometries.push(basinFloor)

  // Basin left wall
  const basinLeftWall = new THREE.BoxGeometry(basinLength, outletDepth + basinDepth, wallThickness)
  basinLeftWall.translate(
    transitionLength + basinLength / 2,
    endElevation - basinDepth + (outletDepth + basinDepth) / 2,
    -width / 2 - wallThickness / 2
  )
  geometries.push(basinLeftWall)

  // Basin right wall
  const basinRightWall = new THREE.BoxGeometry(basinLength, outletDepth + basinDepth, wallThickness)
  basinRightWall.translate(
    transitionLength + basinLength / 2,
    endElevation - basinDepth + (outletDepth + basinDepth) / 2,
    width / 2 + wallThickness / 2
  )
  geometries.push(basinRightWall)

  // End sill if enabled
  if (basin.hasEndSill && basin.endSillHeight > 0) {
    const sillHeight = safeNumber(basin.endSillHeight, 0.3)
    const endSill = new THREE.BoxGeometry(wallThickness * 2, sillHeight, width)
    endSill.translate(
      transitionLength + basinLength - wallThickness,
      endElevation - basinDepth + sillHeight / 2,
      0
    )
    geometries.push(endSill)
  }

  // Baffle blocks for Type III basins
  if (basin.type === "type-iii" && basin.baffleRows > 0) {
    const baffleHeight = basinDepth * 0.5
    const baffleWidth = width / 5
    const numBaffles = 3

    for (let row = 0; row < basin.baffleRows; row++) {
      const rowX = transitionLength + (basinLength * (row + 1)) / (basin.baffleRows + 1)

      for (let b = 0; b < numBaffles; b++) {
        const baffleZ = -width / 2 + (width * (b + 0.5)) / numBaffles
        const baffle = new THREE.BoxGeometry(wallThickness * 2, baffleHeight, baffleWidth)
        baffle.translate(rowX, endElevation - basinDepth + baffleHeight / 2, baffleZ)
        geometries.push(baffle)
      }
    }
  }

  // Merge all geometries
  const merged = mergeBufferGeometries(geometries)

  // Clean up individual geometries
  for (const g of geometries) {
    g.dispose()
  }

  return merged
}

/**
 * TransitionMesh - Renders a hydraulic transition with Rust-generated geometry
 */
export function TransitionMesh({
  transition,
  color,
  opacity,
  metalness,
  roughness,
  wireframe,
  isSelected,
  onClick,
  onPointerOver,
  onPointerOut,
  meshRef: externalMeshRef,
  onMeshReady,
}: TransitionMeshProps) {
  const internalGroupRef = useRef<THREE.Group>(null)
  const internalMeshRef = useRef<THREE.Mesh>(null)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate stilling basin geometry if configured
  const basinGeometry = useMemo(() => {
    if (!transition.stillingBasin || transition.stillingBasin.type === "none") {
      return null
    }

    return createStillingBasinGeometry(
      transition.stillingBasin,
      transition.outlet?.width ?? 2,
      transition.outlet?.depth ?? 1.5,
      transition.length,
      transition.endElevation ?? 0,
      transition.outlet?.wallThickness ?? 0.15
    )
  }, [
    transition.stillingBasin?.type,
    transition.stillingBasin?.length,
    transition.stillingBasin?.depth,
    transition.stillingBasin?.baffleRows,
    transition.stillingBasin?.hasEndSill,
    transition.stillingBasin?.endSillHeight,
    transition.outlet?.width,
    transition.outlet?.depth,
    transition.outlet?.wallThickness,
    transition.length,
    transition.endElevation,
    transition.stillingBasin,
  ])

  // Generate geometry from Rust backend
  useEffect(() => {
    let cancelled = false

    async function loadGeometry() {
      if (!isTauriAvailable()) {
        // Fallback: create placeholder box
        const fallbackGeo = new THREE.BoxGeometry(transition.length, 1, 2)
        if (!cancelled) {
          setGeometry(fallbackGeo)
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Build transition input for backend with robust defaults for ALL values
        // Use safeNumber to ensure no null/undefined/NaN/Infinity reaches Rust
        const transitionLength = safeNumber(transition.length, 5)

        // Get section types
        const inletType = transition.inlet?.sectionType || "trapezoidal"
        const outletType = transition.outlet?.sectionType || "trapezoidal"

        // For triangular sections, width MUST be 0 (they have no bottom width)
        // This is critical for correct geometry interpolation in transitions
        const getWidthForSection = (
          sectionType: string,
          width: number | undefined,
          defaultWidth: number
        ): number => {
          if (sectionType === "triangular") {
            return 0 // Triangular sections have no bottom width
          }
          return safeNumber(width, defaultWidth)
        }

        const input: TransitionGeometryInput = {
          name: transition.name || "Transition",
          transition_type: transition.transitionType || "linear",
          length: transitionLength,
          resolution: Math.min(0.5, transitionLength / 10),
          start_station: safeNumber(transition.startStation, 0),
          start_elevation: safeNumber(transition.startElevation, 0),
          end_elevation: safeNumber(transition.endElevation, 0),
          inlet: {
            section_type: inletType,
            width: getWidthForSection(inletType, transition.inlet?.width, 2),
            depth: safeNumber(transition.inlet?.depth, 1.5),
            side_slope: safeNumber(transition.inlet?.sideSlope, 1.5),
            wall_thickness: safeNumber(transition.inlet?.wallThickness, 0.15),
            floor_thickness: safeNumber(transition.inlet?.floorThickness, 0.15),
          },
          outlet: {
            section_type: outletType,
            width: getWidthForSection(outletType, transition.outlet?.width, 2),
            depth: safeNumber(transition.outlet?.depth, 1.5),
            side_slope: safeNumber(transition.outlet?.sideSlope, 1.5),
            wall_thickness: safeNumber(transition.outlet?.wallThickness, 0.15),
            floor_thickness: safeNumber(transition.outlet?.floorThickness, 0.15),
          },
        }

        const meshResult = await generateTransitionMesh(input)

        if (!cancelled && meshResult) {
          const geo = meshResultToBufferGeometry(meshResult)
          setGeometry(geo)
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Failed to generate transition mesh:", err)
        if (!cancelled) {
          setError(String(err))
          // Use fallback geometry
          const fallbackGeo = new THREE.BoxGeometry(transition.length, 1, 2)
          setGeometry(fallbackGeo)
          setIsLoading(false)
        }
      }
    }

    loadGeometry()

    return () => {
      cancelled = true
    }
  }, [
    transition.name,
    transition.transitionType,
    transition.length,
    transition.startStation,
    transition.startElevation,
    transition.endElevation,
    transition.inlet?.sectionType,
    transition.inlet?.width,
    transition.inlet?.depth,
    transition.inlet?.sideSlope,
    transition.inlet?.wallThickness,
    transition.inlet?.floorThickness,
    transition.outlet?.sectionType,
    transition.outlet?.width,
    transition.outlet?.depth,
    transition.outlet?.sideSlope,
    transition.outlet?.wallThickness,
    transition.outlet?.floorThickness,
  ])

  // Clean up geometry on unmount
  useEffect(() => {
    return () => {
      geometry?.dispose()
      basinGeometry?.dispose()
    }
  }, [geometry, basinGeometry])

  // Forward mesh ref (using group when we have basin, mesh otherwise)
  useEffect(() => {
    const targetRef = basinGeometry ? internalGroupRef.current : internalMeshRef.current
    if (externalMeshRef && targetRef) {
      ;(externalMeshRef as React.MutableRefObject<THREE.Mesh | THREE.Group | null>).current =
        targetRef
      onMeshReady?.()
    }
    return () => {
      if (externalMeshRef) {
        ;(externalMeshRef as React.MutableRefObject<THREE.Mesh | THREE.Group | null>).current = null
      }
    }
  }, [externalMeshRef, onMeshReady, basinGeometry])

  if (isLoading || !geometry) {
    return (
      <mesh position={[transition.startStation + transition.length / 2, 0, 0]}>
        <boxGeometry args={[transition.length, 0.5, 1]} />
        <meshStandardMaterial color="#22c55e" opacity={0.3} transparent wireframe />
      </mesh>
    )
  }

  // Position: X = startStation (progressive), Y = 0 (elevation is in geometry), Z = 0
  const worldPositionX = transition.startStation ?? 0

  // Material props shared between transition and basin
  const materialProps = {
    color: error ? "#ef4444" : color,
    wireframe,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    metalness,
    roughness,
  }

  // If we have a stilling basin, wrap everything in a group
  if (basinGeometry) {
    return (
      <group
        ref={internalGroupRef}
        position={[worldPositionX, 0, 0]}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        {/* Main transition mesh */}
        <mesh ref={internalMeshRef} geometry={geometry}>
          <meshStandardMaterial {...materialProps} />
          {isSelected && (
            <lineSegments>
              <edgesGeometry args={[geometry]} />
              <lineBasicMaterial color="#22c55e" linewidth={2} />
            </lineSegments>
          )}
        </mesh>

        {/* Stilling basin mesh */}
        <mesh geometry={basinGeometry}>
          <meshStandardMaterial {...materialProps} />
          {isSelected && (
            <lineSegments>
              <edgesGeometry args={[basinGeometry]} />
              <lineBasicMaterial color="#22c55e" linewidth={2} />
            </lineSegments>
          )}
        </mesh>
      </group>
    )
  }

  // No stilling basin - render just the transition mesh
  return (
    <mesh
      ref={internalMeshRef}
      geometry={geometry}
      position={[worldPositionX, 0, 0]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshStandardMaterial {...materialProps} />
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#22c55e" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  )
}

export default TransitionMesh
