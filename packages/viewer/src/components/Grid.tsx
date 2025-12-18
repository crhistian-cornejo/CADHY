import { Grid as DreiGrid } from "@react-three/drei"

interface GridProps {
  size?: number
  cellSize?: number
  cellColor?: string
  sectionColor?: string
}

export function Grid({
  size = 20,
  cellSize = 1,
  cellColor = "#6b7280",
  sectionColor = "#9ca3af",
}: GridProps) {
  return (
    <DreiGrid
      args={[size, size]}
      cellSize={cellSize}
      cellColor={cellColor}
      sectionColor={sectionColor}
      fadeDistance={50}
      fadeStrength={1}
      infiniteGrid
    />
  )
}
