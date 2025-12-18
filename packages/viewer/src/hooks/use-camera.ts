import { useThree } from "@react-three/fiber"
import { useCallback } from "react"

export function useCamera() {
  const { camera } = useThree()

  const resetCamera = useCallback(() => {
    camera.position.set(10, 10, 10)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const setView = useCallback(
    (view: "top" | "front" | "right" | "isometric") => {
      switch (view) {
        case "top":
          camera.position.set(0, 20, 0)
          break
        case "front":
          camera.position.set(0, 0, 20)
          break
        case "right":
          camera.position.set(20, 0, 0)
          break
        case "isometric":
          camera.position.set(10, 10, 10)
          break
      }
      camera.lookAt(0, 0, 0)
    },
    [camera]
  )

  return { resetCamera, setView }
}
