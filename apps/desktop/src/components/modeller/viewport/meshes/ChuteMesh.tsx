/**
 * ChuteMesh Component
 *
 * Renders a hydraulic chute (rápida) with Rust-generated geometry.
 * Supports multiple chute types: smooth, stepped, baffled, ogee, converging.
 * Includes USBR stilling basin geometry for Types I-IV and SAF.
 *
 * Uses the Rust backend (CorridorGenerator::generate_chute) for proper
 * solid geometry generation - same approach as ChannelMesh and TransitionMesh.
 */

import type { ThreeEvent } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import {
  type ChuteGeometryInput,
  generateChuteMesh,
  isTauriAvailable,
  type StillingBasinDef,
} from "@/services/hydraulics-service"
import type { ChuteObject } from "@/stores/modeller-store"
import { meshResultToBufferGeometry, safeNumber } from "../geometry-utils"

export interface ChuteMeshProps {
  chute: ChuteObject
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
 * Convert frontend StillingBasinConfig to backend StillingBasinDef
 */
function convertStillingBasin(basin: ChuteObject["stillingBasin"]): StillingBasinDef | null {
  if (!basin || basin.type === "none") return null

  return {
    type: basin.type,
    length: safeNumber(basin.length, 5),
    depth: safeNumber(basin.depth, 1),
    floorThickness: safeNumber(basin.floorThickness, 0.25),
    chuteBlocks: basin.chuteBlocks
      ? {
          count: basin.chuteBlocks.count ?? 3,
          width: safeNumber(basin.chuteBlocks.width, 0.3),
          height: safeNumber(basin.chuteBlocks.height, 0.3),
          thickness: safeNumber(basin.chuteBlocks.thickness, 0.2),
          spacing: safeNumber(basin.chuteBlocks.spacing, 0.3),
        }
      : null,
    baffleBlocks: basin.baffleBlocks
      ? {
          rows: basin.baffleBlocks.rows ?? 1,
          blocksPerRow: basin.baffleBlocks.blocksPerRow ?? 3,
          width: safeNumber(basin.baffleBlocks.width, 0.3),
          height: safeNumber(basin.baffleBlocks.height, 0.4),
          thickness: safeNumber(basin.baffleBlocks.thickness, 0.15),
          distanceFromInlet: safeNumber(basin.baffleBlocks.distanceFromInlet, 1),
          rowSpacing: safeNumber(basin.baffleBlocks.rowSpacing, 1.5),
        }
      : null,
    endSill: basin.endSill
      ? {
          type: basin.endSill.type as "solid" | "dentated",
          height: safeNumber(basin.endSill.height, 0.3),
          toothWidth: basin.endSill.toothWidth,
          toothSpacing: basin.endSill.toothSpacing,
        }
      : null,
    wingwallAngle: safeNumber(basin.wingwallAngle, 0),
  }
}

/**
 * ChuteMesh - Renders a hydraulic chute with Rust-generated geometry
 */
export function ChuteMesh({
  chute,
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
}: ChuteMeshProps) {
  const internalMeshRef = useRef<THREE.Mesh>(null)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate geometry from Rust backend
  useEffect(() => {
    let cancelled = false

    async function loadGeometry() {
      if (!isTauriAvailable()) {
        // Fallback: create placeholder box
        const totalLength = safeNumber(chute.inletLength, 0) + safeNumber(chute.length, 20)
        const fallbackGeo = new THREE.BoxGeometry(totalLength, 1, safeNumber(chute.width, 2))
        if (!cancelled) {
          setGeometry(fallbackGeo)
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Build chute input for backend
        const input: ChuteGeometryInput = {
          name: chute.name || "Chute",
          chuteType: chute.chuteType || "smooth",
          inletLength: safeNumber(chute.inletLength, 1),
          inletSlope: safeNumber(chute.inletSlope, 0),
          length: safeNumber(chute.length, 20),
          drop: safeNumber(chute.drop, 10),
          width: safeNumber(chute.width, 2),
          depth: safeNumber(chute.depth, 1.5),
          sideSlope: safeNumber(chute.sideSlope, 0),
          thickness: safeNumber(chute.thickness, 0.2),
          startStation: safeNumber(chute.startStation, 0),
          startElevation: safeNumber(chute.startElevation, 0),
          resolution: Math.min(0.5, safeNumber(chute.length, 20) / 20),
          stepHeight: safeNumber(chute.stepHeight, 0.5),
          stepLength: safeNumber(chute.stepLength, 0), // 0 = calculate automatically
          baffleSpacing: safeNumber(chute.baffleSpacing, 2),
          baffleHeight: safeNumber(chute.baffleHeight, 0.3),
          stillingBasin: convertStillingBasin(chute.stillingBasin),
        }

        const meshResult = await generateChuteMesh(input)

        if (!cancelled && meshResult) {
          const geo = meshResultToBufferGeometry(meshResult)
          setGeometry(geo)
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Failed to generate chute mesh:", err)
        if (!cancelled) {
          setError(String(err))
          // Use fallback geometry
          const totalLength = safeNumber(chute.inletLength, 0) + safeNumber(chute.length, 20)
          const fallbackGeo = new THREE.BoxGeometry(totalLength, 1, safeNumber(chute.width, 2))
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
    chute.name,
    chute.chuteType,
    chute.inletLength,
    chute.inletSlope,
    chute.length,
    chute.drop,
    chute.width,
    chute.depth,
    chute.sideSlope,
    chute.thickness,
    chute.startStation,
    chute.startElevation,
    chute.stepHeight,
    chute.stepLength,
    chute.baffleSpacing,
    chute.baffleHeight,
    chute.stillingBasin?.type,
    chute.stillingBasin?.length,
    chute.stillingBasin?.depth,
    chute.stillingBasin?.chuteBlocks,
    chute.stillingBasin?.baffleBlocks,
    chute.stillingBasin?.endSill,
    chute.stillingBasin?.wingwallAngle,
    chute.stillingBasin,
  ])

  // Clean up geometry on unmount
  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  // Forward mesh ref
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

  if (isLoading || !geometry) {
    // Loading placeholder
    const totalLength = safeNumber(chute.inletLength, 0) + safeNumber(chute.length, 20)
    return (
      <mesh
        position={[chute.startStation + totalLength / 2, chute.startElevation - chute.drop / 2, 0]}
      >
        <boxGeometry args={[totalLength, 0.5, chute.width]} />
        <meshStandardMaterial color="#f59e0b" opacity={0.3} transparent wireframe />
      </mesh>
    )
  }

  // Position: X = startStation (geometry starts at 0, offset by startStation)
  const worldPositionX = safeNumber(chute.startStation, 0)

  return (
    <mesh
      ref={internalMeshRef}
      geometry={geometry}
      position={[worldPositionX, 0, 0]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshStandardMaterial
        color={error ? "#ef4444" : color}
        wireframe={wireframe}
        transparent={opacity < 1}
        opacity={opacity}
        side={THREE.DoubleSide}
        metalness={metalness}
        roughness={roughness}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#f59e0b" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  )
}

export default ChuteMesh
