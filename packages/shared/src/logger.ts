/**
 * Conditional logger that outputs in development, silent in production
 *
 * @example
 * ```ts
 * import { logger, createLogger } from '@cadhy/shared/logger'
 *
 * logger.log('Debug info') // Only shows in dev
 * logger.error('Critical error') // Always shows
 *
 * // With namespaces
 * const cadLogger = createLogger('cad')
 * cadLogger.log('Creating shape') // [CAD] Creating shape
 * ```
 */

const isDev =
  (typeof import.meta !== "undefined" && import.meta.env?.DEV) ??
  (typeof process !== "undefined" && process.env.NODE_ENV === "development") ??
  false

// Style for namespace prefix
const NAMESPACE_STYLES = {
  cad: "color: #22c55e; font-weight: bold",
  texture: "color: #0ea5e9; font-weight: bold",
  hydraulics: "color: #3b82f6; font-weight: bold",
  ai: "color: #a855f7; font-weight: bold",
  project: "color: #f97316; font-weight: bold",
  mesh: "color: #14b8a6; font-weight: bold",
  viewer: "color: #ec4899; font-weight: bold",
  store: "color: #eab308; font-weight: bold",
} as const

type LogNamespace = keyof typeof NAMESPACE_STYLES | (string & {})

/**
 * Creates a namespaced logger
 */
function createNamespacedLogger(namespace: LogNamespace) {
  const prefix = `[${namespace.toUpperCase()}]`
  const style =
    NAMESPACE_STYLES[namespace as keyof typeof NAMESPACE_STYLES] ??
    "color: #6b7280; font-weight: bold"

  // Use styled console in browser, plain prefix in Node
  const isBrowser = typeof window !== "undefined"

  const formatMessage = (msg: unknown) => {
    if (isBrowser) {
      return [`%c${prefix}`, style, msg]
    }
    return [`${prefix}`, msg]
  }

  return {
    log: isDev
      ? (...args: unknown[]) => console.log(...formatMessage(args[0]), ...args.slice(1))
      : () => {},
    warn: isDev
      ? (...args: unknown[]) => console.warn(...formatMessage(args[0]), ...args.slice(1))
      : () => {},
    error: (...args: unknown[]) => console.error(...formatMessage(args[0]), ...args.slice(1)),
    info: isDev
      ? (...args: unknown[]) => console.info(...formatMessage(args[0]), ...args.slice(1))
      : () => {},
    debug: isDev
      ? (...args: unknown[]) => console.debug(...formatMessage(args[0]), ...args.slice(1))
      : () => {},
    group: isDev
      ? (...args: unknown[]) => console.group(...formatMessage(args[0]), ...args.slice(1))
      : () => {},
    groupEnd: isDev ? console.groupEnd.bind(console) : () => {},
    table: isDev ? console.table.bind(console) : () => {},
  } as const
}

/**
 * Conditional console wrapper (global logger)
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
 * Create a namespaced logger for better organization
 *
 * @example
 * ```ts
 * const cadLogger = createLogger('cad')
 * cadLogger.log('Creating box', { width: 1, height: 2 })
 * // Output: [CAD] Creating box { width: 1, height: 2 }
 * ```
 */
export function createLogger(namespace: LogNamespace) {
  return createNamespacedLogger(namespace)
}

/**
 * Pre-configured loggers for common modules
 */
export const loggers = {
  cad: createNamespacedLogger("cad"),
  texture: createNamespacedLogger("texture"),
  hydraulics: createNamespacedLogger("hydraulics"),
  ai: createNamespacedLogger("ai"),
  project: createNamespacedLogger("project"),
  mesh: createNamespacedLogger("mesh"),
  viewer: createNamespacedLogger("viewer"),
  store: createNamespacedLogger("store"),
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
 * Type-safe namespaced logger instance
 */
export type NamespacedLogger = ReturnType<typeof createLogger>

/**
 * Type-safe performance instance
 */
export type Performance = typeof perf
