/**
 * Flickering Grid Component
 *
 * Animated grid background with optional text mask.
 * OPTIMIZED: Mask canvas is cached and only recreated on resize.
 * Uses CSS variables for theming and reduces frame rate for better perf.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number
  gridGap?: number
  flickerChance?: number
  color?: string
  maxOpacity?: number
  text?: string
  fontSize?: number
  fontWeight?: number | string
}

export function FlickeringGrid({
  squareSize = 3,
  gridGap = 3,
  flickerChance = 0.2,
  color = "#6B7280",
  maxOpacity = 0.15,
  text = "",
  fontSize = 140,
  fontWeight = 600,
  className,
  ...props
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Cache the mask data to avoid recreating every frame
  const maskCacheRef = useRef<Uint8Array | null>(null)
  const [isInView, setIsInView] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Parse color once
  const rgbColor = useMemo(() => {
    if (color.startsWith("#")) {
      const hex = color.slice(1)
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      }
    }
    return { r: 107, g: 114, b: 128 } // Default gray
  }, [color])

  // Create mask bitmap once (not every frame!)
  const createMaskCache = useCallback(
    (width: number, height: number, cols: number, rows: number, dpr: number) => {
      if (!text) {
        maskCacheRef.current = null
        return
      }

      const maskCanvas = document.createElement("canvas")
      maskCanvas.width = width
      maskCanvas.height = height
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })
      if (!maskCtx) return

      maskCtx.save()
      maskCtx.scale(dpr, dpr)
      maskCtx.fillStyle = "white"
      maskCtx.font = `${fontWeight} ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`
      maskCtx.textAlign = "center"
      maskCtx.textBaseline = "middle"
      maskCtx.fillText(text, width / (2 * dpr), height / (2 * dpr))
      maskCtx.restore()

      // Pre-compute which cells have text (boolean array, much faster than getImageData per frame)
      const cellSize = (squareSize + gridGap) * dpr
      const mask = new Uint8Array(cols * rows)

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = Math.floor(i * cellSize)
          const y = Math.floor(j * cellSize)
          const sw = Math.floor(squareSize * dpr)
          const sh = Math.floor(squareSize * dpr)

          // Sample just the center pixel for performance
          const centerX = Math.min(x + Math.floor(sw / 2), width - 1)
          const centerY = Math.min(y + Math.floor(sh / 2), height - 1)
          const pixel = maskCtx.getImageData(centerX, centerY, 1, 1).data
          mask[i * rows + j] = pixel[0] > 0 ? 1 : 0
        }
      }

      maskCacheRef.current = mask
    },
    [text, fontSize, fontWeight, squareSize, gridGap]
  )

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number
    ) => {
      ctx.clearRect(0, 0, width, height)
      const mask = maskCacheRef.current
      const cellSize = (squareSize + gridGap) * dpr
      const sw = squareSize * dpr
      const sh = squareSize * dpr

      // Batch similar colors together for better GPU performance
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j
          const x = i * cellSize
          const y = j * cellSize

          const baseOpacity = squares[idx] ?? 0
          const hasText = mask ? mask[idx] === 1 : false
          const finalOpacity = hasText ? Math.min(1, baseOpacity * 3 + 0.4) : baseOpacity

          ctx.fillStyle = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${finalOpacity})`
          ctx.fillRect(x, y, sw, sh)
        }
      }
    },
    [rgbColor, squareSize, gridGap]
  )

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const cols = Math.ceil(width / (squareSize + gridGap))
      const rows = Math.ceil(height / (squareSize + gridGap))

      const squares = new Float32Array(cols * rows)
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity
      }

      // Create mask cache once on setup
      createMaskCache(canvas.width, canvas.height, cols, rows, dpr)

      return { cols, rows, squares, dpr }
    },
    [squareSize, gridGap, maxOpacity, createMaskCache]
  )

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      // Reduce flicker rate for smoother animation
      const threshold = flickerChance * deltaTime
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < threshold) {
          squares[i] = Math.random() * maxOpacity
        }
      }
    },
    [flickerChance, maxOpacity]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let gridParams: ReturnType<typeof setupCanvas>

    const updateCanvasSize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      setCanvasSize({ width: newWidth, height: newHeight })
      gridParams = setupCanvas(canvas, newWidth, newHeight)
    }

    updateCanvasSize()

    let lastTime = 0
    // Throttle to ~30fps for better performance (vs 60fps default)
    const targetFrameTime = 1000 / 30

    const animate = (time: number) => {
      if (!isInView) return

      const elapsed = time - lastTime

      // Only update if enough time has passed (throttle)
      if (elapsed >= targetFrameTime) {
        const deltaTime = elapsed / 1000
        lastTime = time

        updateSquares(gridParams.squares, deltaTime)
        drawGrid(
          ctx,
          canvas.width,
          canvas.height,
          gridParams.cols,
          gridParams.rows,
          gridParams.squares,
          gridParams.dpr
        )
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
    })

    resizeObserver.observe(container)

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) {
          setIsInView(entry.isIntersecting)
        }
      },
      { threshold: 0 }
    )

    intersectionObserver.observe(canvas)

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate)
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [setupCanvas, updateSquares, drawGrid, isInView])

  return (
    <div ref={containerRef} className={`h-full w-full ${className ?? ""}`} {...props}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      />
    </div>
  )
}
