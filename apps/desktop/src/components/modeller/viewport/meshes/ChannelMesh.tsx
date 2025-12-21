/**
 * ChannelMesh Component
 *
 * Renders a hydraulic channel with Rust-generated geometry.
 * Calls the Rust backend to generate mesh from channel parameters,
 * then converts to Three.js BufferGeometry for rendering.
 * Falls back to a placeholder box when Tauri is not available.
 */

import { loggers } from "@cadhy/shared"
import type { ThreeEvent } from "@react-three/fiber"
import React, { useEffect, useRef, useState } from "react"
import * as THREE from "three"

import {
  type ChannelSectionType,
  convertSectionToBackend,
  generateChannelMesh,
  isTauriAvailable,
} from "@/services/hydraulics-service"
import type { PBRTextureMaps } from "@/services/texture-service"
import { type ChannelObject, useViewportSettings } from "@/stores/modeller-store"
import {
  createChannelFallbackGeometry,
  getSectionParams,
  meshResultToBufferGeometry,
} from "../geometry-utils"

const log = loggers.mesh

export interface ChannelMeshProps {
  channel: ChannelObject
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
  pbrTextures?: PBRTextureMaps | null
  uvRepeat?: { x: number; y: number }
}

export const ChannelMesh = React.memo(function ChannelMesh({
  channel,
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
  pbrTextures,
  uvRepeat = { x: 1, y: 1 },
}: ChannelMeshProps) {
  const internalMeshRef = useRef<THREE.Mesh>(null)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const viewportSettings = useViewportSettings()

  // Store texture reference to update UV repeat without re-render
  const texturesRef = useRef<PBRTextureMaps | null>(null)
  texturesRef.current = pbrTextures

  // Apply UV repeat to textures when they first load
  useEffect(() => {
    if (pbrTextures) {
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
  }, [pbrTextures])

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

  // Generate geometry from Rust backend
  useEffect(() => {
    let cancelled = false

    async function loadGeometry() {
      if (!isTauriAvailable()) {
        // Fallback: create placeholder geometry based on channel dimensions
        const fallbackGeo = createChannelFallbackGeometry(channel, viewportSettings.textureScale)
        if (!cancelled) {
          setGeometry(fallbackGeo)
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Convert channel section to backend format
        // Extract section parameters based on type
        const sectionParams = getSectionParams(channel.section)
        const section = convertSectionToBackend(
          channel.section.type as ChannelSectionType,
          sectionParams
        )

        // Call Rust to generate mesh
        // Resolution = distance between cross-sections (meters)
        // Use 1m for good detail, or length/10 for longer channels
        const resolution = Math.min(1.0, channel.length / 10)
        const meshResult = await generateChannelMesh({
          name: channel.name,
          section,
          manning_n: channel.manningN,
          slope: channel.slope,
          length: channel.length,
          start_elevation: channel.startElevation,
          resolution,
          wall_thickness: channel.thickness ?? 0.15,
          floor_thickness: channel.thickness ?? 0.15,
        })

        if (cancelled) return

        // Convert MeshResult to Three.js BufferGeometry with global texture scale
        const geo = meshResultToBufferGeometry(meshResult, viewportSettings.textureScale)
        setGeometry(geo)
      } catch (err) {
        if (!cancelled) {
          log.error("Failed to generate channel mesh:", err)
          setError(err instanceof Error ? err.message : "Unknown error")
          // Use fallback geometry on error
          const fallbackGeo = createChannelFallbackGeometry(channel, viewportSettings.textureScale)
          setGeometry(fallbackGeo)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadGeometry()

    return () => {
      cancelled = true
    }
  }, [
    channel.name,
    channel.section,
    channel.manningN,
    channel.slope,
    channel.length,
    channel.startElevation,
    channel.thickness,
    channel,
    viewportSettings.textureScale, // Regenerate UVs when global texture scale changes
  ])

  // Clean up geometry on unmount
  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  // Set userData for LOD tracking
  useEffect(() => {
    if (internalMeshRef.current) {
      internalMeshRef.current.userData.objectId = channel.id
    }
  }, [channel.id])

  // Sync external ref with internal ref and notify when ready
  // Must depend on geometry so it triggers when mesh becomes available after loading
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
  }, [externalMeshRef, onMeshReady, geometry])

  // Show loading placeholder at correct world position
  if (isLoading || !geometry) {
    const loadingPositionX = channel.startStation ?? 0
    return (
      <mesh
        position={[
          loadingPositionX + channel.length / 2, // Center of channel
          channel.startElevation ?? 0,
          0,
        ]}
      >
        <boxGeometry args={[channel.length, 0.5, 1]} />
        <meshStandardMaterial color="#666" transparent opacity={0.3} wireframe />
      </mesh>
    )
  }

  // The geometry from the backend is generated in LOCAL coordinates:
  // - X: 0 to channel.length (flow direction)
  // - Y: startElevation changing with slope (vertical, after Z->Y swap)
  // - Z: transverse section width (after Y->Z swap)
  //
  // For CONNECTED channels, we need to position this geometry at the correct
  // PROGRESSIVE (station) along the channel system. The startStation tells us
  // where this channel begins in the overall system.
  //
  // Position: X = startStation (progressive), Y = 0 (elevation is in geometry), Z = 0
  const worldPositionX = channel.startStation ?? 0

  return (
    <mesh
      ref={internalMeshRef}
      geometry={geometry}
      position={[worldPositionX, 0, 0]}
      rotation={[
        THREE.MathUtils.degToRad(channel.transform.rotation.x),
        THREE.MathUtils.degToRad(channel.transform.rotation.y),
        THREE.MathUtils.degToRad(channel.transform.rotation.z),
      ]}
      scale={[channel.transform.scale.x, channel.transform.scale.y, channel.transform.scale.z]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshStandardMaterial
        color={error ? "#ef4444" : pbrTextures?.albedo ? "#ffffff" : color}
        wireframe={wireframe}
        transparent={opacity < 1}
        opacity={opacity}
        side={THREE.DoubleSide}
        metalness={metalness}
        roughness={roughness}
        {...(pbrTextures?.albedo && { map: pbrTextures.albedo })}
        {...(pbrTextures?.normal && { normalMap: pbrTextures.normal })}
        {...(pbrTextures?.roughness && { roughnessMap: pbrTextures.roughness })}
        {...(pbrTextures?.metalness && { metalnessMap: pbrTextures.metalness })}
        {...(pbrTextures?.ao && { aoMap: pbrTextures.ao, aoMapIntensity: 1 })}
      />
    </mesh>
  )
})

export default ChannelMesh
