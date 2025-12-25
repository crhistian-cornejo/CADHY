/**
 * Performance Settings Panel
 *
 * Controls for LOD, texture cache, and instancing optimizations
 */

import { Button, Label, Separator, Slider, Switch } from "@cadhy/ui"
import { useEffect, useState } from "react"
import { instancingManager } from "@/services/instancing-manager"
import { type LODConfig, lodManager } from "@/services/lod-manager"
import { type TextureCacheConfig, textureCache } from "@/services/texture-cache"

export function PerformanceSettingsPanel() {
  const [lodConfig, setLodConfig] = useState<LODConfig>(lodManager.config)
  const [textureCacheConfig, setTextureCacheConfig] = useState<TextureCacheConfig>(
    textureCache.config
  )
  const [stats, setStats] = useState({
    lod: lodManager.getStats(),
    instancing: instancingManager.getStats(),
    textureCache: textureCache.getStats(),
  })

  // Update stats every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        lod: lodManager.getStats(),
        instancing: instancingManager.getStats(),
        textureCache: textureCache.getStats(),
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleLODEnabledChange = (enabled: boolean) => {
    const newConfig = { ...lodConfig, enabled }
    setLodConfig(newConfig)
    lodManager.setConfig(newConfig)
  }

  const handleLODUpdateIntervalChange = (value: number[]) => {
    const newConfig = { ...lodConfig, updateInterval: value[0] }
    setLodConfig(newConfig)
    lodManager.setConfig(newConfig)
  }

  const handleTextureCacheSizeChange = (value: number[]) => {
    const newConfig = { ...textureCacheConfig, maxCacheSize: value[0] }
    setTextureCacheConfig(newConfig)
    // Note: TextureCache config update would need a setter method
  }

  const handleClearTextureCache = () => {
    textureCache.clear()
    setStats((prev) => ({ ...prev, textureCache: textureCache.getStats() }))
  }

  const handleClearLODCache = () => {
    lodManager.clearCache()
    setStats((prev) => ({ ...prev, lod: lodManager.getStats() }))
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Performance Optimizations</h3>
        <p className="text-xs text-muted-foreground">
          Configure LOD, texture caching, and instancing for optimal performance
        </p>
      </div>

      <Separator />

      {/* LOD Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Level of Detail (LOD)</Label>
            <p className="text-xs text-muted-foreground">Reduce polygons for distant objects</p>
          </div>
          <Switch checked={lodConfig.enabled} onCheckedChange={handleLODEnabledChange} />
        </div>

        {lodConfig.enabled && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Update Interval</Label>
                <span className="text-xs text-muted-foreground">{lodConfig.updateInterval}ms</span>
              </div>
              <Slider
                value={[lodConfig.updateInterval]}
                onValueChange={handleLODUpdateIntervalChange}
                min={50}
                max={1000}
                step={50}
                className="w-full"
              />
            </div>

            {/* LOD Stats */}
            <div className="rounded-2xl bg-muted/30 p-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cached Objects:</span>
                <span className="font-mono">{stats.lod.cachedObjects}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">LOD Variants:</span>
                <span className="font-mono">{stats.lod.totalLODVariants}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Memory Used:</span>
                <span className="font-mono">{stats.lod.memoryEstimate}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLODCache}
              className="w-full text-xs"
            >
              Clear LOD Cache
            </Button>
          </>
        )}
      </div>

      <Separator />

      {/* Texture Cache Settings */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Texture Cache</Label>
          <p className="text-xs text-muted-foreground">Optimize texture loading and memory</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Max Cache Size</Label>
            <span className="text-xs text-muted-foreground">
              {textureCacheConfig.maxCacheSize} MB
            </span>
          </div>
          <Slider
            value={[textureCacheConfig.maxCacheSize]}
            onValueChange={handleTextureCacheSizeChange}
            min={128}
            max={2048}
            step={128}
            className="w-full"
          />
        </div>

        {/* Texture Cache Stats */}
        <div className="rounded-2xl bg-muted/30 p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Current Size:</span>
            <span className="font-mono">{stats.textureCache.cacheSize}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Textures Loaded:</span>
            <span className="font-mono">{stats.textureCache.textureCount}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearTextureCache}
          className="w-full text-xs"
        >
          Clear Texture Cache
        </Button>
      </div>

      <Separator />

      {/* Instancing Stats */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Geometry Instancing</Label>
          <p className="text-xs text-muted-foreground">GPU instancing for repeated objects</p>
        </div>

        <div className="rounded-2xl bg-muted/30 p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Instanced Meshes:</span>
            <span className="font-mono">{stats.instancing.instancedMeshCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Instances:</span>
            <span className="font-mono">{stats.instancing.totalInstances}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Memory Saved:</span>
            <span className="font-mono text-status-success">{stats.instancing.memorySaved}</span>
          </div>
        </div>

        {stats.instancing.totalInstances > 0 && (
          <div className="rounded-2xl bg-status-success-bg border border-status-success-border p-2">
            <p className="text-xs text-status-success">
              ✓ Instancing active: {stats.instancing.instancedMeshCount} mesh
              {stats.instancing.instancedMeshCount !== 1 ? "es" : ""} optimized
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Quick Actions</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleClearLODCache()
              handleClearTextureCache()
            }}
            className="text-xs"
          >
            Clear All Caches
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLodConfig({ ...lodConfig, enabled: true })
              lodManager.setConfig({ enabled: true })
            }}
            className="text-xs"
          >
            Enable All
          </Button>
        </div>
      </div>
    </div>
  )
}
