import { beforeEach, describe, expect, it } from "bun:test"
import {
  AngleStateMachine,
  createStateMachine,
  MagnitudeStateMachine,
  QuaternionStateMachine,
  type Vec3,
  VectorStateMachine,
} from "../state-machine"

describe("MagnitudeStateMachine", () => {
  let sm: MagnitudeStateMachine

  beforeEach(() => {
    sm = new MagnitudeStateMachine(10)
  })

  describe("initial state", () => {
    it("should have correct initial values", () => {
      expect(sm.original).toBe(10)
      expect(sm.current).toBe(10)
    })
  })

  describe("current value", () => {
    it("should update current value", () => {
      sm.current = 20
      expect(sm.current).toBe(20)
      expect(sm.original).toBe(10) // original unchanged
    })
  })

  describe("original value", () => {
    it("should update both original and current when setting original", () => {
      sm.original = 30
      expect(sm.original).toBe(30)
      expect(sm.current).toBe(30)
    })
  })

  describe("start", () => {
    it("should mark the current value as starting point", () => {
      sm.current = 25
      sm.start()
      expect(sm.original).toBe(25)
    })
  })

  describe("push", () => {
    it("should commit current as new original", () => {
      sm.current = 50
      sm.push()
      expect(sm.original).toBe(50)
      expect(sm.current).toBe(50)
    })
  })

  describe("revert", () => {
    it("should revert current to original", () => {
      sm.current = 100
      sm.revert()
      expect(sm.current).toBe(10)
    })
  })

  describe("interrupt", () => {
    it("should revert by default", () => {
      sm.current = 100
      sm.interrupt()
      expect(sm.current).toBe(10) // reverts by default
    })
  })

  describe("min constraint", () => {
    it("should enforce minimum value", () => {
      sm.min = 5
      sm.current = 3
      expect(sm.current).toBe(5)
    })

    it("should allow values above min", () => {
      sm.min = 5
      sm.current = 10
      expect(sm.current).toBe(10)
    })
  })

  describe("delta", () => {
    it("should calculate difference from original", () => {
      sm.current = 15
      expect(sm.delta).toBe(5)
    })
  })
})

describe("VectorStateMachine", () => {
  let sm: VectorStateMachine

  beforeEach(() => {
    sm = new VectorStateMachine({ x: 0, y: 0, z: 0 })
  })

  describe("initial state", () => {
    it("should have correct initial values", () => {
      expect(sm.original).toEqual({ x: 0, y: 0, z: 0 })
      expect(sm.current).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe("current value", () => {
    it("should update current value without affecting original", () => {
      sm.current = { x: 1, y: 2, z: 3 }
      expect(sm.current).toEqual({ x: 1, y: 2, z: 3 })
      expect(sm.original).toEqual({ x: 0, y: 0, z: 0 })
    })

    it("should create a copy of the value", () => {
      const vec: Vec3 = { x: 1, y: 2, z: 3 }
      sm.current = vec
      vec.x = 999

      expect(sm.current.x).toBe(1) // should not be affected
    })
  })

  describe("original value", () => {
    it("should update both when setting original", () => {
      sm.original = { x: 5, y: 5, z: 5 }
      expect(sm.original).toEqual({ x: 5, y: 5, z: 5 })
      expect(sm.current).toEqual({ x: 5, y: 5, z: 5 })
    })
  })

  describe("lifecycle", () => {
    it("should work with start/push/revert cycle", () => {
      sm.current = { x: 1, y: 1, z: 1 }
      sm.start()
      expect(sm.original).toEqual({ x: 1, y: 1, z: 1 })

      sm.current = { x: 2, y: 2, z: 2 }
      sm.push()
      expect(sm.original).toEqual({ x: 2, y: 2, z: 2 })

      sm.current = { x: 3, y: 3, z: 3 }
      sm.revert()
      expect(sm.current).toEqual({ x: 2, y: 2, z: 2 })
    })
  })

  describe("delta", () => {
    it("should calculate vector difference", () => {
      sm.original = { x: 1, y: 2, z: 3 }
      sm.current = { x: 4, y: 6, z: 8 }

      expect(sm.delta).toEqual({ x: 3, y: 4, z: 5 })
    })
  })
})

describe("QuaternionStateMachine", () => {
  let sm: QuaternionStateMachine

  beforeEach(() => {
    sm = new QuaternionStateMachine({ x: 0, y: 0, z: 0, w: 1 })
  })

  describe("initial state", () => {
    it("should have identity quaternion", () => {
      expect(sm.original).toEqual({ x: 0, y: 0, z: 0, w: 1 })
      expect(sm.current).toEqual({ x: 0, y: 0, z: 0, w: 1 })
    })
  })

  describe("lifecycle", () => {
    it("should work with push/revert", () => {
      sm.current = { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
      sm.push()

      sm.current = { x: 1, y: 0, z: 0, w: 0 }
      sm.revert()

      expect(sm.current).toEqual({ x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 })
    })
  })
})

describe("AngleStateMachine", () => {
  let sm: AngleStateMachine

  beforeEach(() => {
    sm = new AngleStateMachine(0)
  })

  describe("radians and degrees", () => {
    it("should convert from degrees to radians", () => {
      sm.degrees = 180
      expect(sm.current).toBeCloseTo(Math.PI, 5)
    })

    it("should convert from radians to degrees", () => {
      sm.current = Math.PI
      expect(sm.degrees).toBeCloseTo(180, 5)
    })

    it("should handle 90 degrees", () => {
      sm.degrees = 90
      expect(sm.current).toBeCloseTo(Math.PI / 2, 5)
    })

    it("should handle negative angles", () => {
      sm.degrees = -45
      expect(sm.current).toBeCloseTo(-Math.PI / 4, 5)
    })
  })

  describe("lifecycle", () => {
    it("should work with push/revert in degrees", () => {
      sm.degrees = 45
      sm.push()

      sm.degrees = 90
      expect(sm.degrees).toBeCloseTo(90, 5)

      sm.revert()
      expect(sm.degrees).toBeCloseTo(45, 5)
    })
  })
})

describe("createStateMachine factory", () => {
  it("should create MagnitudeStateMachine for numbers", () => {
    const sm = createStateMachine(42)
    expect(sm).toBeInstanceOf(MagnitudeStateMachine)
    expect(sm.current).toBe(42)
  })

  it("should create VectorStateMachine for Vec3", () => {
    const sm = createStateMachine({ x: 1, y: 2, z: 3 })
    expect(sm).toBeInstanceOf(VectorStateMachine)
    expect(sm.current).toEqual({ x: 1, y: 2, z: 3 })
  })

  it("should create QuaternionStateMachine for Quat", () => {
    const sm = createStateMachine({ x: 0, y: 0, z: 0, w: 1 })
    expect(sm).toBeInstanceOf(QuaternionStateMachine)
    expect(sm.current).toEqual({ x: 0, y: 0, z: 0, w: 1 })
  })
})
