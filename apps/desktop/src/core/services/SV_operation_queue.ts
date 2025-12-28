/**
 * Operation Queue
 *
 * Sequential executor for async operations to prevent race conditions.
 * Based on Plasticity's SequentialExecutor pattern.
 *
 * Use cases:
 * - CAD boolean operations
 * - Geometry generation
 * - Mesh simplification
 * - Save/load operations
 *
 * Benefits:
 * - Prevents race conditions
 * - Ensures operations complete in order
 * - Automatic retry on failure
 * - Progress tracking
 */

export interface QueuedOperation<T = unknown> {
  id: string
  name: string
  execute: () => Promise<T>
  priority?: number
  retries?: number
  maxRetries?: number
}

export interface QueueStats {
  pending: number
  running: number
  completed: number
  failed: number
  totalProcessed: number
}

export type OperationStatus = "pending" | "running" | "completed" | "failed"

export interface OperationProgress {
  id: string
  name: string
  status: OperationStatus
  error?: Error
  startTime?: number
  endTime?: number
}

export class OperationQueue {
  private queue: QueuedOperation[] = []
  private running: QueuedOperation | null = null
  private progress = new Map<string, OperationProgress>()
  private completedCount = 0
  private failedCount = 0
  private isProcessing = false

  /**
   * Add an operation to the queue
   */
  async enqueue<T>(operation: Omit<QueuedOperation<T>, "id">): Promise<T> {
    const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const queuedOp: QueuedOperation<T> = {
      id,
      ...operation,
      retries: 0,
      maxRetries: operation.maxRetries ?? 3,
    }

    // Add to progress tracking
    this.progress.set(id, {
      id,
      name: operation.name,
      status: "pending",
    })

    // Add to queue (sorted by priority if provided)
    this.queue.push(queuedOp as QueuedOperation)
    if (operation.priority !== undefined) {
      this.queue.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      void this.process()
    }

    // Return a promise that resolves when this specific operation completes
    return new Promise<T>((resolve, reject) => {
      const checkCompletion = setInterval(() => {
        const prog = this.progress.get(id)
        if (!prog) {
          clearInterval(checkCompletion)
          reject(new Error("Operation not found"))
          return
        }

        if (prog.status === "completed") {
          clearInterval(checkCompletion)
          resolve(undefined as T) // We don't store results, just completion
        } else if (prog.status === "failed") {
          clearInterval(checkCompletion)
          reject(prog.error ?? new Error("Operation failed"))
        }
      }, 50)
    })
  }

  /**
   * Process the queue sequentially
   */
  private async process(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!
      this.running = operation

      const prog = this.progress.get(operation.id)
      if (!prog) continue

      prog.status = "running"
      prog.startTime = Date.now()

      try {
        await operation.execute()

        // Success
        prog.status = "completed"
        prog.endTime = Date.now()
        this.completedCount++
      } catch (error) {
        // Retry logic
        const currentRetries = operation.retries ?? 0
        const maxRetries = operation.maxRetries ?? 3

        if (currentRetries < maxRetries) {
          operation.retries = currentRetries + 1
          console.warn(
            `[OperationQueue] Operation "${operation.name}" failed, retrying (${operation.retries}/${maxRetries})...`
          )
          // Re-add to queue
          this.queue.unshift(operation)
        } else {
          // Max retries exceeded
          prog.status = "failed"
          prog.error = error instanceof Error ? error : new Error(String(error))
          prog.endTime = Date.now()
          this.failedCount++
          console.error(`[OperationQueue] Operation "${operation.name}" failed:`, error)
        }
      }
    }

    this.running = null
    this.isProcessing = false
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return {
      pending: this.queue.length,
      running: this.running ? 1 : 0,
      completed: this.completedCount,
      failed: this.failedCount,
      totalProcessed: this.completedCount + this.failedCount,
    }
  }

  /**
   * Get progress for a specific operation
   */
  getProgress(id: string): OperationProgress | undefined {
    return this.progress.get(id)
  }

  /**
   * Get all operation progress
   */
  getAllProgress(): OperationProgress[] {
    return Array.from(this.progress.values())
  }

  /**
   * Clear completed operations from progress tracking
   */
  clearCompleted(): void {
    for (const [id, prog] of this.progress.entries()) {
      if (prog.status === "completed" || prog.status === "failed") {
        this.progress.delete(id)
      }
    }
  }

  /**
   * Clear all operations and reset queue
   */
  clear(): void {
    this.queue = []
    this.running = null
    this.progress.clear()
    this.completedCount = 0
    this.failedCount = 0
  }

  /**
   * Cancel a pending operation
   */
  cancel(id: string): boolean {
    const index = this.queue.findIndex((op) => op.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      const prog = this.progress.get(id)
      if (prog) {
        prog.status = "failed"
        prog.error = new Error("Cancelled")
      }
      return true
    }
    return false
  }
}

// Singleton instance for global operations
export const operationQueue = new OperationQueue()

// Named queues for different operation types
export const geometryQueue = new OperationQueue()
export const fileQueue = new OperationQueue()
export const cadQueue = new OperationQueue()
