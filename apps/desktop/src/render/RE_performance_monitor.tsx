/**
 * Performance Monitor - Real-time FPS and frame time analysis
 *
 * Shows:
 * - Current FPS
 * - Frame time (ms)
 * - Spike detection (frames > 16.67ms)
 * - Memory usage
 * - Render count
 */

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"

interface PerformanceData {
  fps: number
  frameTime: number
  avgFrameTime: number
  maxFrameTime: number
  spikeCount: number
  renderCount: number
  triangles: number
  drawCalls: number
  memoryUsed: number
}

// Spike threshold - anything above 16.67ms (60fps) is a spike
const SPIKE_THRESHOLD = 16.67
// Warning threshold - anything above 33.33ms (30fps) is severe
const SEVERE_THRESHOLD = 33.33

export function PerformanceMonitor() {
  const { gl } = useThree()
  const [data, setData] = useState<PerformanceData>({
    fps: 60,
    frameTime: 0,
    avgFrameTime: 0,
    maxFrameTime: 0,
    spikeCount: 0,
    renderCount: 0,
    triangles: 0,
    drawCalls: 0,
    memoryUsed: 0,
  })

  const frameTimesRef = useRef<number[]>([])
  const lastTimeRef = useRef(performance.now())
  const renderCountRef = useRef(0)
  const spikeCountRef = useRef(0)
  const maxFrameTimeRef = useRef(0)

  useFrame(() => {
    const now = performance.now()
    const frameTime = now - lastTimeRef.current
    lastTimeRef.current = now
    renderCountRef.current++

    // Track frame times (keep last 60 frames)
    frameTimesRef.current.push(frameTime)
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift()
    }

    // Detect spikes
    if (frameTime > SPIKE_THRESHOLD) {
      spikeCountRef.current++
      if (frameTime > SEVERE_THRESHOLD) {
        console.warn(
          `[PERF] 🔴 SEVERE SPIKE: ${frameTime.toFixed(1)}ms (${(1000 / frameTime).toFixed(0)} fps)`
        )
      }
    }

    // Track max frame time
    if (frameTime > maxFrameTimeRef.current) {
      maxFrameTimeRef.current = frameTime
    }

    // Update stats every 500ms
    if (renderCountRef.current % 30 === 0) {
      const avgFrameTime =
        frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      const fps = 1000 / avgFrameTime

      const info = gl.info
      setData({
        fps: Math.round(fps),
        frameTime: Math.round(frameTime * 10) / 10,
        avgFrameTime: Math.round(avgFrameTime * 10) / 10,
        maxFrameTime: Math.round(maxFrameTimeRef.current * 10) / 10,
        spikeCount: spikeCountRef.current,
        renderCount: renderCountRef.current,
        triangles: info.render.triangles,
        drawCalls: info.render.calls,
        memoryUsed: (info.memory?.geometries || 0) + (info.memory?.textures || 0),
      })
    }
  })

  // Reset max frame time every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      maxFrameTimeRef.current = 0
      spikeCountRef.current = 0
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return null // This component only logs, doesn't render
}

// HTML overlay version for detailed stats
export function PerformanceOverlay() {
  const [stats, setStats] = useState({
    fps: 0,
    frameTime: 0,
    spikes: 0,
    maxSpike: 0,
    triangles: 0,
    draws: 0,
  })

  useEffect(() => {
    let frameCount = 0
    let spikeCount = 0
    let maxSpike = 0
    let lastTime = performance.now()
    const frameTimes: number[] = []

    const measure = () => {
      const now = performance.now()
      const delta = now - lastTime
      lastTime = now
      frameCount++

      frameTimes.push(delta)
      if (frameTimes.length > 60) frameTimes.shift()

      if (delta > SPIKE_THRESHOLD) {
        spikeCount++
        if (delta > maxSpike) maxSpike = delta
      }

      // Update every 500ms
      if (frameCount % 30 === 0) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
        setStats({
          fps: Math.round(1000 / avg),
          frameTime: Math.round(avg * 10) / 10,
          spikes: spikeCount,
          maxSpike: Math.round(maxSpike * 10) / 10,
          triangles: 0, // Would need gl.info access
          draws: 0,
        })
      }

      requestAnimationFrame(measure)
    }

    const id = requestAnimationFrame(measure)

    // Reset every 5 seconds
    const resetInterval = setInterval(() => {
      spikeCount = 0
      maxSpike = 0
    }, 5000)

    return () => {
      cancelAnimationFrame(id)
      clearInterval(resetInterval)
    }
  }, [])

  const fpsColor =
    stats.fps >= 55 ? "text-green-400" : stats.fps >= 30 ? "text-yellow-400" : "text-red-400"

  return (
    <div className="absolute top-2 left-2 bg-black/80 text-white text-xs font-mono p-2 rounded z-50 pointer-events-none">
      <div className={fpsColor}>FPS: {stats.fps}</div>
      <div>Frame: {stats.frameTime}ms</div>
      <div className={stats.spikes > 0 ? "text-yellow-400" : ""}>Spikes (5s): {stats.spikes}</div>
      <div className={stats.maxSpike > SEVERE_THRESHOLD ? "text-red-400" : ""}>
        Max: {stats.maxSpike}ms
      </div>
    </div>
  )
}
