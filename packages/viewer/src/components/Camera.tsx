import { PerspectiveCamera } from "@react-three/drei"

interface CameraProps {
  position?: [number, number, number]
  fov?: number
  makeDefault?: boolean
}

export function Camera({ position = [10, 10, 10], fov = 50, makeDefault = true }: CameraProps) {
  return <PerspectiveCamera makeDefault={makeDefault} position={position} fov={fov} />
}
