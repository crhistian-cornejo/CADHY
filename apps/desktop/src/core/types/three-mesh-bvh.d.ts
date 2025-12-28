import { Raycaster, Intersection } from "three"

declare module "three" {
  interface BufferGeometry {
    boundsTree?: any
    computeBoundsTree(options?: any): void
    disposeBoundsTree(): void
  }

  interface Mesh {
    raycast: (raycaster: Raycaster, intersects: Intersection[]) => void
  }
}
