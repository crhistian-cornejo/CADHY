/**
 * Executable Interface - CADHY Command Infrastructure
 *
 * Defines the contract for interactive operations that can be executed with callbacks.
 * Based on Plasticity's Executable pattern used by gizmos, pickers, and commands.
 *
 * @example
 * ```typescript
 * class PointPicker implements Executable<PointResult, PointResult> {
 *   execute(cb?: (pt: PointResult) => void): CancellablePromise<PointResult> {
 *     return new CancellablePromise((resolve) => {
 *       // Set up point picking...
 *       // Call cb() on each intermediate point
 *       // Call resolve() on final point
 *     });
 *   }
 * }
 * ```
 */

import { CancellablePromise } from "./cancellable-promise"

/**
 * An executable operation that can report intermediate results via callback
 * and returns a final result via promise.
 *
 * @typeParam I - Intermediate result type (passed to callback)
 * @typeParam O - Output result type (returned by promise)
 */
export interface Executable<I, O> {
  /**
   * Execute the operation.
   *
   * @param cb - Optional callback for intermediate results
   * @param args - Additional arguments for the operation
   * @returns A cancellable promise resolving to the final result
   */
  execute(cb?: (intermediate: I) => void, ...args: unknown[]): CancellablePromise<O>
}

/**
 * Context provided to executable operations during execution.
 * Contains abort signal, progress reporting, and metadata.
 */
export interface ExecutionContext {
  /** Abort signal for cancellation */
  readonly signal: AbortSignal

  /** Report progress (0-1) */
  reportProgress?(progress: number): void

  /** Update metadata displayed to the user */
  updateMetadata?(metadata: { title?: string; description?: string }): void
}

/**
 * Options for creating an executable from an async function
 */
export interface ExecutableOptions<I, O> {
  /** The async function to execute */
  execute: (ctx: ExecutionContext, cb?: (i: I) => void) => Promise<O>

  /** Optional name for debugging */
  name?: string
}

/**
 * Create an Executable from an async function.
 * Provides a simpler API for creating executables without implementing the interface.
 */
export function createExecutable<I, O>(options: ExecutableOptions<I, O>): Executable<I, O> {
  return {
    execute(cb?: (i: I) => void): CancellablePromise<O> {
      const controller = new AbortController()

      const ctx: ExecutionContext = {
        signal: controller.signal,
        reportProgress: () => {},
        updateMetadata: () => {},
      }

      return new CancellablePromise<O>((resolve, reject) => {
        options.execute(ctx, cb).then(resolve).catch(reject)

        return () => {
          controller.abort()
        }
      })
    },
  }
}

/**
 * Compose multiple executables in sequence.
 * Each executable's output becomes available for the next.
 */
export function sequenceExecutables<A, B, C>(
  first: Executable<A, B>,
  second: Executable<B, C>
): Executable<A | B, C> {
  return {
    execute(cb?: (i: A | B) => void): CancellablePromise<C> {
      return new CancellablePromise<C>((resolve, reject) => {
        let secondPromise: CancellablePromise<C> | null = null

        const firstPromise = first.execute((a) => {
          cb?.(a)
        })

        firstPromise
          .then((b) => {
            cb?.(b)
            secondPromise = second.execute((bb) => {
              cb?.(bb)
            })
            secondPromise.then(resolve).catch(reject)
          })
          .catch(reject)

        return () => {
          firstPromise.cancel()
          secondPromise?.cancel()
        }
      })
    },
  }
}

/**
 * Create an executable that runs multiple executables in parallel.
 * All must complete for the result to resolve.
 */
export function parallelExecutables<T>(executables: Executable<T, T>[]): Executable<T, T[]> {
  return {
    execute(cb?: (i: T) => void): CancellablePromise<T[]> {
      return new CancellablePromise<T[]>((resolve, reject) => {
        const promises = executables.map((e) =>
          e.execute((value) => {
            cb?.(value)
          })
        )

        Promise.all(promises).then(resolve).catch(reject)

        return () => {
          for (const promise of promises) {
            promise.cancel()
          }
        }
      })
    },
  }
}
