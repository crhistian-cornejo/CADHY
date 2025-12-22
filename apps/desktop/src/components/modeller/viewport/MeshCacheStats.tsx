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
      className="absolute top-12 left-4 bg-black/80 text-white p-3 rounded-lg font-mono text-xs z-50"
      style={{ pointerEvents: "none" }}
    >
      <div className="font-bold mb-2 text-green-400">Mesh Cache Stats</div>

      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Geometries:</span>{" "}
          <span className="text-white">{stats.geometries.total}</span>
          <span className="text-gray-500">
            {" "}
            (active: {stats.geometries.active}, unused: {stats.geometries.unused})
          </span>
        </div>

        <div>
          <span className="text-gray-400">Materials:</span>{" "}
          <span className="text-white">{stats.materials.total}</span>
          <span className="text-gray-500">
            {" "}
            (active: {stats.materials.active}, unused: {stats.materials.unused})
          </span>
        </div>

        <div>
          <span className="text-gray-400">Memory:</span>{" "}
          <span className="text-green-400 font-bold">{stats.memoryEstimate}</span>
        </div>

        {stats.geometries.total > stats.geometries.active && (
          <div className="text-yellow-400 text-[10px] mt-1">
            💡 {stats.geometries.total - stats.geometries.active} geometries will be cleaned up
          </div>
        )}
      </div>
    </div>
  )
}

export default MeshCacheStats
