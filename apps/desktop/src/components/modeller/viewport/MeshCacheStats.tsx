/**
 * Mesh Cache Stats Display
 *
 * Shows cache statistics for debugging and optimization monitoring.
 * Only shown when stats are enabled in viewport.
 */

import { useEffect, useState } from "react"
import { meshCache } from "@/services/mesh-cache"

export function MeshCacheStats() {
  const [stats, setStats] = useState(() => meshCache.getStats())

  useEffect(() => {
    // Update stats every second
    const interval = setInterval(() => {
      setStats(meshCache.getStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="absolute top-12 left-4 bg-popover text-popover-foreground p-3 rounded-2xl font-mono text-xs z-50 border border-border shadow-lg"
      style={{ pointerEvents: "none" }}
    >
      <div className="font-bold mb-2 text-primary">Mesh Cache Stats</div>

      <div className="space-y-1">
        <div>
          <span className="text-muted-foreground">Geometries:</span>{" "}
          <span className="text-foreground">{stats.geometries.total}</span>
          <span className="text-muted-foreground/70">
            {" "}
            (active: {stats.geometries.active}, unused: {stats.geometries.unused})
          </span>
        </div>

        <div>
          <span className="text-muted-foreground">Materials:</span>{" "}
          <span className="text-foreground">{stats.materials.total}</span>
          <span className="text-muted-foreground/70">
            {" "}
            (active: {stats.materials.active}, unused: {stats.materials.unused})
          </span>
        </div>

        <div>
          <span className="text-muted-foreground">Memory:</span>{" "}
          <span className="text-primary font-bold">{stats.memoryEstimate}</span>
        </div>

        {stats.geometries.total > stats.geometries.active && (
          <div className="text-yellow-400 text-xs mt-1">
            💡 {stats.geometries.total - stats.geometries.active} geometries will be cleaned up
          </div>
        )}
      </div>
    </div>
  )
}

export default MeshCacheStats
