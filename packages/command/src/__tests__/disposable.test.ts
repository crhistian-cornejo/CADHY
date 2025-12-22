import { describe, expect, it } from "bun:test"
import {
  CompositeDisposable,
  type Disposable,
  DisposableValue,
  disposableAbortController,
  disposableInterval,
  disposableTimeout,
  isDisposable,
  toDisposable,
  withDisposable,
} from "../disposable"

describe("isDisposable", () => {
  it("should return true for objects with dispose method", () => {
    const obj = { dispose: () => {} }
    expect(isDisposable(obj)).toBe(true)
  })

  it("should return false for objects without dispose", () => {
    expect(isDisposable({})).toBe(false)
    expect(isDisposable(null)).toBe(false)
    expect(isDisposable(undefined)).toBe(false)
    expect(isDisposable(42)).toBe(false)
  })
})

describe("CompositeDisposable", () => {
  it("should dispose all added disposables", () => {
    const composite = new CompositeDisposable()
    const disposed: string[] = []

    composite.add(
      { dispose: () => disposed.push("a") },
      { dispose: () => disposed.push("b") },
      { dispose: () => disposed.push("c") }
    )

    composite.dispose()

    expect(disposed).toEqual(["c", "b", "a"]) // LIFO order
  })

  it("should not dispose twice", () => {
    const composite = new CompositeDisposable()
    let count = 0

    composite.add({ dispose: () => count++ })
    composite.dispose()
    composite.dispose()

    expect(count).toBe(1)
  })

  it("should report isDisposed correctly", () => {
    const composite = new CompositeDisposable()
    expect(composite.isDisposed).toBe(false)

    composite.dispose()
    expect(composite.isDisposed).toBe(true)
  })

  it("should dispose items added after initial disposal", () => {
    const composite = new CompositeDisposable()
    composite.dispose()

    let disposed = false
    composite.add({
      dispose: () => {
        disposed = true
      },
    })

    expect(disposed).toBe(true) // immediately disposed
  })

  it("should remove disposables", () => {
    const composite = new CompositeDisposable()
    const disposed: string[] = []

    const a: Disposable = { dispose: () => disposed.push("a") }
    const b: Disposable = { dispose: () => disposed.push("b") }

    composite.add(a, b)
    composite.remove(a)
    composite.dispose()

    expect(disposed).toEqual(["b"])
  })

  it("should clear all disposables without disposing", () => {
    const composite = new CompositeDisposable()
    let disposed = false

    composite.add({
      dispose: () => {
        disposed = true
      },
    })
    composite.clear()

    expect(disposed).toBe(false)
    expect(composite.size).toBe(0)
  })
})

describe("DisposableValue", () => {
  it("should hold a value and dispose it", () => {
    let disposed = false
    const resource: Disposable = {
      dispose: () => {
        disposed = true
      },
    }
    const dv = new DisposableValue(resource)

    expect(dv.value).toBe(resource)
    expect(disposed).toBe(false)

    dv.dispose()
    expect(disposed).toBe(true)
  })

  it("should not dispose twice", () => {
    let count = 0
    const resource: Disposable = { dispose: () => count++ }
    const dv = new DisposableValue(resource)

    dv.dispose()
    dv.dispose()

    expect(count).toBe(1)
  })

  it("should clear value reference on dispose", () => {
    const resource: Disposable = { dispose: () => {} }
    const dv = new DisposableValue(resource)
    dv.dispose()

    expect(dv.value).toBeNull()
  })

  it("should take ownership", () => {
    const resource: Disposable = { dispose: () => {} }
    const dv = new DisposableValue(resource)

    const taken = dv.take()
    expect(taken).toBe(resource)
    expect(dv.value).toBeNull()
  })
})

describe("disposableTimeout", () => {
  it("should create a disposable that clears timeout", async () => {
    let called = false
    const disposable = disposableTimeout(() => {
      called = true
    }, 100)

    disposable.dispose()

    await new Promise((r) => setTimeout(r, 150))
    expect(called).toBe(false)
  })

  it("should call function if not disposed", async () => {
    let called = false
    disposableTimeout(() => {
      called = true
    }, 10)

    await new Promise((r) => setTimeout(r, 50))
    expect(called).toBe(true)
  })
})

describe("disposableInterval", () => {
  it("should create a disposable that clears interval", async () => {
    let count = 0
    const disposable = disposableInterval(() => count++, 20)

    await new Promise((r) => setTimeout(r, 50))
    disposable.dispose()
    const countAtDispose = count

    await new Promise((r) => setTimeout(r, 50))
    expect(count).toBe(countAtDispose)
  })
})

describe("disposableAbortController", () => {
  it("should create AbortController that aborts on dispose", () => {
    const { controller, disposable } = disposableAbortController()

    expect(controller.signal.aborted).toBe(false)
    disposable.dispose()
    expect(controller.signal.aborted).toBe(true)
  })
})

describe("withDisposable", () => {
  it("should dispose resources after async function", async () => {
    let disposed = false

    const result = await withDisposable(async (disposables) => {
      disposables.add({
        dispose: () => {
          disposed = true
        },
      })
      expect(disposed).toBe(false)
      return 42
    })

    expect(result).toBe(42)
    expect(disposed).toBe(true)
  })

  it("should dispose even if function throws", async () => {
    let disposed = false

    await expect(
      withDisposable(async (disposables) => {
        disposables.add({
          dispose: () => {
            disposed = true
          },
        })
        throw new Error("test")
      })
    ).rejects.toThrow("test")

    expect(disposed).toBe(true)
  })
})

describe("toDisposable", () => {
  it("should create a Disposable from a function", () => {
    let called = false
    const disposable = toDisposable(() => {
      called = true
    })

    expect(isDisposable(disposable)).toBe(true)
    disposable.dispose()
    expect(called).toBe(true)
  })
})
