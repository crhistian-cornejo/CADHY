/**
 * Serialization Utilities - CADHY
 *
 * Safe JSON serialization that handles circular references and complex types.
 */

/**
 * Safely serialize an object to JSON, removing circular references.
 * This is a deep clone that breaks circular references by omitting them.
 *
 * @param obj - The object to serialize
 * @param visited - Internal set to track visited objects (for recursion)
 * @returns A serializable copy of the object without circular references
 */
function removeCircularReferences<T>(obj: T, visited = new WeakSet<object>()): T {
  // Handle primitives and null
  if (obj === null || typeof obj !== "object") {
    return obj
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => removeCircularReferences(item, visited)) as T
  }

  // Handle Date objects - convert to ISO string for JSON
  if (obj instanceof Date) {
    return obj.toISOString() as T
  }

  // Handle TypedArrays - convert to regular arrays
  if (
    obj instanceof Float32Array ||
    obj instanceof Uint32Array ||
    obj instanceof Uint8Array ||
    obj instanceof Int32Array ||
    obj instanceof Float64Array ||
    obj instanceof Uint16Array ||
    obj instanceof Int16Array ||
    obj instanceof Int8Array
  ) {
    return Array.from(obj) as T
  }

  // Handle regular objects
  // Check for circular reference
  if (visited.has(obj as object)) {
    // Return null for circular references (null is JSON-serializable)
    return null as T
  }

  visited.add(obj as object)

  const result = {} as Record<string, unknown>
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      try {
        const value = removeCircularReferences((obj as Record<string, unknown>)[key], visited)
        // Include all values, even null (which represents circular refs)
        result[key] = value
      } catch (err) {
        // If we can't serialize a property, skip it
        console.warn(`[Serialization] Skipping property "${key}" due to serialization error:`, err)
      }
    }
  }
  return result as T
}

/**
 * Safely serialize data for Tauri IPC calls.
 * Removes circular references and converts TypedArrays to regular arrays.
 *
 * @param data - The data to serialize
 * @returns A serializable copy of the data
 */
export function safeSerialize<T>(data: T): T {
  return removeCircularReferences(data)
}

/**
 * Test if an object can be serialized to JSON without errors.
 * Useful for debugging serialization issues.
 *
 * @param obj - The object to test
 * @returns true if the object can be serialized, false otherwise
 */
export function canSerialize(obj: unknown): boolean {
  try {
    JSON.stringify(obj)
    return true
  } catch (err) {
    if (err instanceof Error && err.message.includes("circular")) {
      return false
    }
    throw err
  }
}
