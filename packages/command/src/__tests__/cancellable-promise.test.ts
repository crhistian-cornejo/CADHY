import { describe, expect, it } from "bun:test"
import { CancelError, CancellablePromise, InterruptError } from "../cancellable-promise"

describe("CancellablePromise", () => {
  describe("basic functionality", () => {
    it("should resolve with a value", async () => {
      const promise = new CancellablePromise<number>((resolve) => {
        setTimeout(() => resolve(42), 10)
        return undefined
      })

      const result = await promise
      expect(result).toBe(42)
    })

    it("should reject with an error", async () => {
      const promise = new CancellablePromise<number>((_, reject) => {
        setTimeout(() => reject(new Error("test error")), 10)
        return undefined
      })

      await expect(promise).rejects.toThrow("test error")
    })

    it("should work with then()", async () => {
      const promise = new CancellablePromise<number>((resolve) => {
        resolve(10)
        return undefined
      })

      const result = await promise.then((x) => x * 2)
      expect(result).toBe(20)
    })

    it("should work with catch()", async () => {
      const promise = new CancellablePromise<number>((_, reject) => {
        reject(new Error("test"))
        return undefined
      })

      const result = await promise.catch(() => 99)
      expect(result).toBe(99)
    })

    it("should work with finally()", async () => {
      let finallyCalled = false
      const promise = new CancellablePromise<number>((resolve) => {
        resolve(42)
        return undefined
      })

      await promise.finally(() => {
        finallyCalled = true
      })

      expect(finallyCalled).toBe(true)
    })
  })

  describe("cancellation", () => {
    it("should cancel with CancelError", async () => {
      const promise = new CancellablePromise<number>((resolve) => {
        setTimeout(() => resolve(42), 1000)
        return undefined
      })

      setTimeout(() => promise.cancel(), 10)

      await expect(promise).rejects.toBeInstanceOf(CancelError)
    })

    it("should call cleanup function on cancel", async () => {
      let cleanupCalled = false

      const promise = new CancellablePromise<number>((resolve) => {
        const timeout = setTimeout(() => resolve(42), 1000)
        return () => {
          clearTimeout(timeout)
          cleanupCalled = true
        }
      })

      // Attach catch handler before cancelling to avoid unhandled rejection
      const catchPromise = promise.catch(() => {
        // Expected cancellation
      })

      promise.cancel()

      // Wait for the catch handler
      await catchPromise

      expect(cleanupCalled).toBe(true)
    })
  })

  describe("interrupt", () => {
    it("should interrupt with InterruptError", async () => {
      const promise = new CancellablePromise<number>((resolve) => {
        setTimeout(() => resolve(42), 1000)
        return undefined
      })

      setTimeout(() => promise.interrupt(), 10)

      await expect(promise).rejects.toBeInstanceOf(InterruptError)
    })
  })

  describe("finish", () => {
    it("should finish immediately with the given value", async () => {
      const promise = new CancellablePromise<number>((resolve) => {
        setTimeout(() => resolve(42), 1000)
        return undefined
      })

      promise.finish(100)

      const result = await promise
      expect(result).toBe(100)
    })

    it("should finish immediately with undefined when typed accordingly", async () => {
      const promise = new CancellablePromise<number | undefined>((resolve) => {
        setTimeout(() => resolve(42), 1000)
        return undefined
      })

      promise.finish(undefined)

      const result = await promise
      expect(result).toBeUndefined()
    })
  })

  describe("map", () => {
    it("should transform the resolved value", async () => {
      const promise = new CancellablePromise<number>((resolve) => {
        resolve(10)
        return undefined
      })

      const mapped = promise.map((x) => x.toString())
      const result = await mapped

      expect(result).toBe("10")
    })

    it("should propagate cancellation", async () => {
      const promise = new CancellablePromise<number>((resolve) => {
        setTimeout(() => resolve(10), 1000)
        return undefined
      })

      const mapped = promise.map((x) => x.toString())
      mapped.cancel()

      await expect(mapped).rejects.toBeInstanceOf(CancelError)
    })
  })

  describe("rejectOnInterrupt", () => {
    it("should reject on interrupt", async () => {
      const promise = new CancellablePromise<number>((resolve) => {
        setTimeout(() => resolve(42), 1000)
        return undefined
      }).rejectOnInterrupt()

      promise.interrupt()

      await expect(promise).rejects.toBeInstanceOf(InterruptError)
    })
  })

  describe("static methods", () => {
    describe("delay", () => {
      it("should resolve after specified time", async () => {
        const start = Date.now()
        await CancellablePromise.delay(50)
        const elapsed = Date.now() - start

        expect(elapsed).toBeGreaterThanOrEqual(45)
      })

      it("should be cancellable", async () => {
        const promise = CancellablePromise.delay(1000)
        promise.cancel()

        await expect(promise).rejects.toBeInstanceOf(CancelError)
      })
    })

    describe("resolved", () => {
      it("should create an already resolved promise", async () => {
        const promise = CancellablePromise.resolved(42)
        const result = await promise

        expect(result).toBe(42)
      })
    })

    describe("rejected", () => {
      it("should create an already rejected promise", async () => {
        const error = new Error("test")
        const promise = CancellablePromise.rejected(error)

        await expect(promise).rejects.toBe(error)
      })
    })

    describe("race", () => {
      it("should resolve with the first completed promise", async () => {
        const fast = new CancellablePromise<string>((resolve) => {
          setTimeout(() => resolve("fast"), 10)
          return undefined
        })
        const slow = new CancellablePromise<string>((resolve) => {
          setTimeout(() => resolve("slow"), 100)
          return undefined
        })

        const result = await CancellablePromise.race([fast, slow])
        expect(result).toBe("fast")
      })
    })

    describe("all", () => {
      it("should resolve with all values", async () => {
        const p1 = CancellablePromise.resolved(1)
        const p2 = CancellablePromise.resolved(2)
        const p3 = CancellablePromise.resolved(3)

        const results = await CancellablePromise.all([p1, p2, p3])
        expect(results).toEqual([1, 2, 3])
      })
    })

    describe("fromAbortable", () => {
      it("should create from AbortController", async () => {
        const promise = CancellablePromise.fromAbortable(async (signal) => {
          await new Promise((r) => setTimeout(r, 10))
          if (signal.aborted) throw new Error("aborted")
          return 42
        })

        const result = await promise
        expect(result).toBe(42)
      })

      it("should abort on cancel", async () => {
        const promise = CancellablePromise.fromAbortable(async (signal) => {
          await new Promise((r) => setTimeout(r, 1000))
          if (signal.aborted) throw new Error("aborted")
          return 42
        })

        promise.cancel()

        await expect(promise).rejects.toBeInstanceOf(CancelError)
      })
    })
  })
})

describe("CancelError", () => {
  it("should have correct name", () => {
    const error = new CancelError()
    expect(error.name).toBe("CancelError")
  })

  it("should have message", () => {
    const error = new CancelError("custom message")
    expect(error.message).toBe("custom message")
  })
})

describe("InterruptError", () => {
  it("should have correct name", () => {
    const error = new InterruptError()
    expect(error.name).toBe("InterruptError")
  })
})
