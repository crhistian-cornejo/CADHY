import { Canvas as R3FCanvas } from "@react-three/fiber"
import type { ReactNode } from "react"

interface CanvasProps {
  children?: ReactNode
  className?: string
}

export function Canvas({ children, className }: CanvasProps) {
  return (
    <R3FCanvas
      className={className}
      camera={{ position: [10, 10, 10], fov: 50 }}
      gl={{ antialias: true }}
    >
      {children}
    </R3FCanvas>
  )
}
