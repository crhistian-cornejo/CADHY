import { OrbitControls } from "@react-three/drei"

interface ControlsProps {
  enablePan?: boolean
  enableZoom?: boolean
  enableRotate?: boolean
}

export function Controls({
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
}: ControlsProps) {
  return (
    <OrbitControls
      enablePan={enablePan}
      enableZoom={enableZoom}
      enableRotate={enableRotate}
      makeDefault
    />
  )
}
