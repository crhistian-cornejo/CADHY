/**
 * Conditional logger that outputs in development, silent in production
 *
 * @example
 * ```ts
 * import { logger } from '@cadhy/shared/logger'
 *
 * logger.log('Debug info') // Only shows in dev
 * logger.error('Critical error') // Always shows
 * ```
 */

const isDev =
  (typeof import.meta !== "undefined" && import.meta.env?.DEV) ??
  (typeof process !== "undefined" && process.env.NODE_ENV === "development") ??
  false

/**
 * Conditional console wrapper
 * - log/warn/info/debug: Only in development
 * - error: Always logged (production + development)
 */
export const logger = {
  /**
   * Log message (dev only)
   */
  log: isDev ? console.log.bind(console) : ((() => {}) as typeof console.log),

  /**
   * Warn message (dev only)
   */
  warn: isDev ? console.warn.bind(console) : ((() => {}) as typeof console.warn),

  /**
   * Error message (always logged)
   */
  error: console.error.bind(console),

  /**
   * Info message (dev only)
   */
  info: isDev ? console.info.bind(console) : ((() => {}) as typeof console.info),

  /**
   * Debug message (dev only)
   */
  debug: isDev ? console.debug.bind(console) : ((() => {}) as typeof console.debug),

  /**
   * Group messages (dev only)
   */
  group: isDev ? console.group.bind(console) : ((() => {}) as typeof console.group),

  /**
   * End group (dev only)
   */
  groupEnd: isDev ? console.groupEnd.bind(console) : ((() => {}) as typeof console.groupEnd),

  /**
   * Table display (dev only)
   */
  table: isDev ? console.table.bind(console) : ((() => {}) as typeof console.table),
} as const

/**
 * Performance measurement utilities (dev only)
 *
 * @example
 * ```ts
 * import { perf } from '@cadhy/shared/logger'
 *
 * perf.mark('operation-start')
 * // ... do work
 * perf.measure('operation', 'operation-start')
 * ```
 */
export const perf = {
  /**
   * Create a performance mark
   */
  mark: isDev
    ? performance.mark.bind(performance)
    : ((() => undefined) as unknown as typeof performance.mark),

  /**
   * Measure time between marks
   */
  measure: isDev
    ? performance.measure.bind(performance)
    : ((() => undefined) as unknown as typeof performance.measure),

  /**
   * Get performance entries
   */
  getEntries: isDev
    ? performance.getEntries.bind(performance)
    : ((() => []) as typeof performance.getEntries),

  /**
   * Clear marks
   */
  clearMarks: isDev
    ? performance.clearMarks.bind(performance)
    : ((() => {}) as typeof performance.clearMarks),

  /**
   * Clear measures
   */
  clearMeasures: isDev
    ? performance.clearMeasures.bind(performance)
    : ((() => {}) as typeof performance.clearMeasures),
} as const

/**
 * Type-safe logger instance
 */
export type Logger = typeof logger

/**
 * Type-safe performance instance
 */
export type Performance = typeof perf
