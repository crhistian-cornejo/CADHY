/**
 * Operation Queue Tests - @cadhy/desktop
 *
 * Tests for the sequential operation queue:
 * - Basic enqueue and processing
 * - Priority ordering
 * - Retry logic
 * - Statistics tracking
 * - Cancellation
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { OperationQueue } from "../core/services/SV_operation_queue"

// ============================================================================
// SETUP
// ============================================================================

let queue: OperationQueue

beforeEach(() => {
  queue = new OperationQueue()
})

// ============================================================================
// BASIC OPERATIONS
// ============================================================================

describe("Basic Operations", () => {
  test("enqueue adds operation and processes it", async () => {
    let executed = false

    await queue.enqueue({
      name: "test-op",
      execute: async () => {
        executed = true
      },
    })

    expect(executed).toBe(true)
  })

  test("operations execute sequentially", async () => {
    const order: number[] = []

    const promise1 = queue.enqueue({
      name: "op-1",
      execute: async () => {
        await new Promise((r) => setTimeout(r, 50))
        order.push(1)
      },
    })

    const promise2 = queue.enqueue({
      name: "op-2",
      execute: async () => {
        order.push(2)
      },
    })

    await Promise.all([promise1, promise2])

    expect(order).toEqual([1, 2])
  })

  test("getStats returns correct counts", async () => {
    await queue.enqueue({
      name: "test",
      execute: async () => {},
    })

    const stats = queue.getStats()
    expect(stats.completed).toBe(1)
    expect(stats.failed).toBe(0)
    expect(stats.pending).toBe(0)
    expect(stats.running).toBe(0)
    expect(stats.totalProcessed).toBe(1)
  })
})

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

describe("Progress Tracking", () => {
  test("getAllProgress returns all operations", async () => {
    await queue.enqueue({ name: "op-1", execute: async () => {} })
    await queue.enqueue({ name: "op-2", execute: async () => {} })

    const progress = queue.getAllProgress()
    expect(progress.length).toBe(2)
    expect(progress.every((p) => p.status === "completed")).toBe(true)
  })

  test("progress includes timing information", async () => {
    await queue.enqueue({ name: "test", execute: async () => {} })

    const progress = queue.getAllProgress()[0]
    expect(progress.startTime).toBeDefined()
    expect(progress.endTime).toBeDefined()
    expect(progress.endTime! >= progress.startTime!).toBe(true)
  })

  test("clearCompleted removes finished operations", async () => {
    await queue.enqueue({ name: "test", execute: async () => {} })

    expect(queue.getAllProgress().length).toBe(1)

    queue.clearCompleted()

    expect(queue.getAllProgress().length).toBe(0)
  })
})

// ============================================================================
// RETRY LOGIC
// ============================================================================

describe("Retry Logic", () => {
  test("retries on failure up to maxRetries", async () => {
    let attempts = 0

    try {
      await queue.enqueue({
        name: "failing-op",
        maxRetries: 2,
        execute: async () => {
          attempts++
          throw new Error("Always fails")
        },
      })
    } catch {
      // Expected to fail
    }

    // Initial attempt + 2 retries = 3 total
    expect(attempts).toBe(3)
  })

  test("succeeds if retry works", async () => {
    let attempts = 0

    await queue.enqueue({
      name: "eventually-succeeds",
      maxRetries: 3,
      execute: async () => {
        attempts++
        if (attempts < 2) {
          throw new Error("Fail first time")
        }
      },
    })

    expect(attempts).toBe(2)
    expect(queue.getStats().completed).toBe(1)
    expect(queue.getStats().failed).toBe(0)
  })

  test("marks as failed after max retries", async () => {
    try {
      await queue.enqueue({
        name: "always-fails",
        maxRetries: 1,
        execute: async () => {
          throw new Error("Permanent failure")
        },
      })
    } catch {
      // Expected
    }

    expect(queue.getStats().failed).toBe(1)
    expect(queue.getStats().completed).toBe(0)
  })

  test("progress tracks error message", async () => {
    try {
      await queue.enqueue({
        name: "error-op",
        maxRetries: 0,
        execute: async () => {
          throw new Error("Specific error message")
        },
      })
    } catch {
      // Expected
    }

    const progress = queue.getAllProgress()[0]
    expect(progress.status).toBe("failed")
    expect(progress.error?.message).toBe("Specific error message")
  })
})

// ============================================================================
// PRIORITY
// ============================================================================

describe("Priority", () => {
  test("higher priority executes first when queued simultaneously", async () => {
    const order: string[] = []

    // Create a fresh queue to ensure clean state
    const priorityQueue = new OperationQueue()

    // Block the queue with a slow operation
    const blocker = priorityQueue.enqueue({
      name: "blocker",
      execute: async () => {
        await new Promise((r) => setTimeout(r, 100))
        order.push("blocker")
      },
    })

    // Queue operations with different priorities while blocker is running
    // These should be sorted by priority
    const lowPriority = priorityQueue.enqueue({
      name: "low",
      priority: 1,
      execute: async () => {
        order.push("low")
      },
    })

    const highPriority = priorityQueue.enqueue({
      name: "high",
      priority: 10,
      execute: async () => {
        order.push("high")
      },
    })

    await Promise.all([blocker, lowPriority, highPriority])

    // After blocker, high priority should run before low
    expect(order[0]).toBe("blocker")
    expect(order[1]).toBe("high")
    expect(order[2]).toBe("low")
  })
})

// ============================================================================
// CANCELLATION
// ============================================================================

describe("Cancellation", () => {
  test("cancel removes pending operation", async () => {
    // Queue a slow operation to block
    const slowOp = queue.enqueue({
      name: "slow",
      execute: async () => {
        await new Promise((r) => setTimeout(r, 200))
      },
    })

    // Queue another operation
    const op2Promise = queue.enqueue({
      name: "will-be-cancelled",
      execute: async () => {
        return "should not run"
      },
    })

    // Get the ID of the second operation
    const progress = queue.getAllProgress()
    const op2Id = progress.find((p) => p.name === "will-be-cancelled")?.id

    if (op2Id) {
      const cancelled = queue.cancel(op2Id)
      expect(cancelled).toBe(true)
    }

    // Handle the rejected promise from the cancelled operation
    await op2Promise.catch(() => {
      // Expected - operation was cancelled
    })

    await slowOp

    // Check that the cancelled operation was marked as failed
    const finalProgress = queue.getAllProgress()
    const cancelledOp = finalProgress.find((p) => p.name === "will-be-cancelled")
    expect(cancelledOp?.status).toBe("failed")
    expect(cancelledOp?.error?.message).toBe("Cancelled")
  })

  test("cancel returns false for non-existent operation", () => {
    const result = queue.cancel("non-existent-id")
    expect(result).toBe(false)
  })
})

// ============================================================================
// CLEAR
// ============================================================================

describe("Clear", () => {
  test("clear resets everything", async () => {
    await queue.enqueue({ name: "test", execute: async () => {} })

    queue.clear()

    const stats = queue.getStats()
    expect(stats.completed).toBe(0)
    expect(stats.failed).toBe(0)
    expect(stats.pending).toBe(0)
    expect(queue.getAllProgress().length).toBe(0)
  })
})

// ============================================================================
// CONCURRENT USAGE
// ============================================================================

describe("Concurrent Usage", () => {
  test("handles many concurrent enqueues", async () => {
    const results: number[] = []
    const promises: Promise<void>[] = []

    for (let i = 0; i < 10; i++) {
      const idx = i
      promises.push(
        queue.enqueue({
          name: `op-${i}`,
          execute: async () => {
            results.push(idx)
          },
        })
      )
    }

    await Promise.all(promises)

    // All operations should complete
    expect(results.length).toBe(10)
    // Operations should execute in order they were enqueued
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
