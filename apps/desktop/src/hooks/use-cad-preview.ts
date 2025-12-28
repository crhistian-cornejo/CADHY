/// <reference types="node" />
import { useCallback, useEffect, useRef, useState } from "react"
import * as cadService from "@/services/cad-service"

export interface PreviewMesh {
  vertices: Float32Array
  indices: Uint32Array
  normals: Float32Array
}

export type PreviewState = "idle" | "loading" | "success" | "error"

export interface CADPreviewOptions {
  /** Backend shape ID */
  backendShapeId: string
  /** Operation type */
  operation: "fillet" | "chamfer" | "shell"
  /** Parameter value (radius, distance, thickness) */
  value: number
  /** Edge indices for edge-specific preview */
  edgeIndices?: number[]
  /** Advanced Fillet: continuity (0:C0, 1:G1, 2:G2) */
  continuity?: number
  /** Advanced Chamfer: mode */
  chamferMode?: "constant" | "two-distances" | "distance-angle"
  /** Advanced Chamfer: second distance */
  value2?: number
  /** Advanced Chamfer: angle (radians) */
  angle?: number
  /** Debounce delay in ms (default: 200) */
  debounceMs?: number
  /** Enable preview (default: true) */
  enabled?: boolean
}

export function useCADPreview({
  backendShapeId,
  operation,
  value,
  edgeIndices,
  continuity = 1,
  chamferMode = "constant",
  value2,
  angle,
  debounceMs = 200,
  enabled = true,
}: CADPreviewOptions) {
  const [previewMesh, setPreviewMesh] = useState<PreviewMesh | null>(null)
  const [previewState, setPreviewState] = useState<PreviewState>("idle")
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Generate preview
  const generatePreview = useCallback(
    async (
      shapeId: string,
      op: string,
      val: number,
      edges?: number[],
      cont = 1,
      mode: "constant" | "two-distances" | "distance-angle" = "constant",
      val2?: number,
      ang?: number
    ) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setPreviewState("loading")
      setError(null)

      try {
        let result: { id: string } | null = null

        // Call appropriate backend operation
        switch (op) {
          case "fillet":
            if (edges && edges.length > 0) {
              result = await cadService.filletEdgesAdvanced(
                shapeId,
                edges,
                edges.map(() => val),
                cont
              )
            } else {
              result = await cadService.fillet(shapeId, val)
            }
            break
          case "chamfer":
            if (edges && edges.length > 0) {
              switch (mode) {
                case "constant":
                  result = await cadService.chamferEdges(
                    shapeId,
                    edges,
                    edges.map(() => val)
                  )
                  break
                case "two-distances":
                  if (val2 === undefined) return
                  result = await cadService.chamferEdgesTwoDistances(
                    shapeId,
                    edges,
                    edges.map(() => val),
                    edges.map(() => val2)
                  )
                  break
                case "distance-angle":
                  if (ang === undefined) return
                  result = await cadService.chamferEdgesDistanceAngle(
                    shapeId,
                    edges,
                    edges.map(() => val),
                    edges.map(() => ang)
                  )
                  break
              }
            } else {
              result = await cadService.chamfer(shapeId, val)
            }
            break
          case "shell":
            result = await cadService.shell(shapeId, val)
            break
        }

        if (!result) {
          throw new Error(`${op} operation returned null`)
        }

        // Tessellate the result
        const meshData = await cadService.tessellate(result.id, 0.1)

        if (abortControllerRef.current?.signal.aborted) {
          return // Request was aborted
        }

        setPreviewMesh({
          vertices: new Float32Array(meshData.vertices),
          indices: new Uint32Array(meshData.indices),
          normals: meshData.normals ? new Float32Array(meshData.normals) : new Float32Array(0),
        })
        setPreviewState("success")
      } catch (err) {
        if (abortControllerRef.current?.signal.aborted) {
          return // Ignore abort errors
        }

        console.error(`[CAD Preview] ${op} preview failed:`, err)
        setError(err instanceof Error ? err.message : String(err))
        setPreviewState("error")
        setPreviewMesh(null)
      }
    },
    []
  )

  // Debounced update
  useEffect(() => {
    if (!enabled || !backendShapeId || value <= 0) {
      setPreviewMesh(null)
      setPreviewState("idle")
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      generatePreview(
        backendShapeId,
        operation,
        value,
        edgeIndices,
        continuity,
        chamferMode,
        value2,
        angle
      )
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [
    backendShapeId,
    operation,
    value,
    edgeIndices,
    continuity,
    chamferMode,
    value2,
    angle,
    debounceMs,
    enabled,
    generatePreview,
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    previewMesh,
    previewState,
    error,
    isLoading: previewState === "loading",
    hasPreview: previewState === "success" && previewMesh !== null,
  }
}
