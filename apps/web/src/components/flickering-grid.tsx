/**
 * Flickering Grid Component
 *
 * Animated grid background with optional text mask.
 * Copied from GraphCAD with full text support.
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
  const [isInView, setIsInView] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const memoizedColor = useMemo(() => {
    // Simple hex to rgba conversion
    if (color.startsWith("#")) {
      const hex = color.slice(1)
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, 1)`
    }
    return color
  }, [color])

  const colorWithOpacity = useCallback((baseColor: string, opacity: number) => {
    if (baseColor.startsWith("rgba")) {
      return baseColor.replace(/[\d.]+\)$/, `${opacity})`)
    }
    if (baseColor.startsWith("rgb")) {
      return baseColor.replace("rgb", "rgba").replace(")", `, ${opacity})`)
    }
    return baseColor
  }, [])

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

      // Create mask canvas for text
      const maskCanvas = document.createElement("canvas")
      maskCanvas.width = width
      maskCanvas.height = height
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })
      if (!maskCtx) return

      // Draw text on mask
      if (text) {
        maskCtx.save()
        maskCtx.scale(dpr, dpr)
        maskCtx.fillStyle = "white"
        maskCtx.font = `${fontWeight} ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
        maskCtx.textAlign = "center"
        maskCtx.textBaseline = "middle"
        maskCtx.fillText(text, width / (2 * dpr), height / (2 * dpr))
        maskCtx.restore()
      }

      // Draw flickering squares
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * (squareSize + gridGap) * dpr
          const y = j * (squareSize + gridGap) * dpr
          const squareWidth = squareSize * dpr
          const squareHeight = squareSize * dpr

          const maskData = maskCtx.getImageData(x, y, squareWidth, squareHeight).data
          const hasText = maskData.some((value, index) => index % 4 === 0 && value > 0)

          const opacity = squares[i * rows + j] ?? 0
          const finalOpacity = hasText ? Math.min(1, opacity * 3 + 0.4) : opacity

          ctx.fillStyle = colorWithOpacity(memoizedColor, finalOpacity ?? 0)
          ctx.fillRect(x, y, squareWidth, squareHeight)
        }
      }
    },
    [memoizedColor, squareSize, gridGap, text, fontSize, fontWeight, colorWithOpacity]
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

      return { cols, rows, squares, dpr }
    },
    [squareSize, gridGap, maxOpacity]
  )

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
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
    const animate = (time: number) => {
      if (!isInView) return

      const deltaTime = (time - lastTime) / 1000
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
