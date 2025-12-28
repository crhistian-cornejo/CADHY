/**
 * @fileoverview Operator Registry - Central registration and lookup
 * @module operators/core
 *
 * Provides a global registry for operators, supporting:
 * - Registration by idname (CATEGORY_OT_name)
 * - Lookup by idname or partial match
 * - Category-based organization
 * - Keymap resolution
 */

import type { OperatorKeymap, OperatorType } from "./OP_types"

// ============================================================================
// TYPES
// ============================================================================

interface RegisteredOperator {
  operator: OperatorType
  registeredAt: number
  category: string
}

interface KeymapEntry {
  operatorId: string
  keymap: OperatorKeymap
}

// ============================================================================
// REGISTRY
// ============================================================================

class OperatorRegistry {
  private operators: Map<string, RegisteredOperator> = new Map()
  private keymaps: KeymapEntry[] = []
  private categories: Map<string, Set<string>> = new Map()

  /**
   * Register an operator
   */
  register(operator: OperatorType): void {
    const category = this.extractCategory(operator.idname)

    this.operators.set(operator.idname, {
      operator,
      registeredAt: Date.now(),
      category,
    })

    // Track by category
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set())
    }
    this.categories.get(category)?.add(operator.idname)

    // Register keymap
    if (operator.keymap) {
      this.keymaps.push({
        operatorId: operator.idname,
        keymap: operator.keymap,
      })
    }

    // PERF: console.log(`[OP_Registry] Registered: ${operator.idname}`)
  }

  /**
   * Unregister an operator
   */
  unregister(idname: string): boolean {
    const entry = this.operators.get(idname)
    if (!entry) return false

    this.operators.delete(idname)
    this.categories.get(entry.category)?.delete(idname)

    // Remove keymap
    this.keymaps = this.keymaps.filter((k) => k.operatorId !== idname)

    // PERF: console.log(`[OP_Registry] Unregistered: ${idname}`)
    return true
  }

  /**
   * Get operator by exact idname
   */
  get(idname: string): OperatorType | undefined {
    return this.operators.get(idname)?.operator
  }

  /**
   * Check if operator exists
   */
  has(idname: string): boolean {
    return this.operators.has(idname)
  }

  /**
   * Get all operators in a category
   */
  getByCategory(category: string): OperatorType[] {
    const ids = this.categories.get(category)
    if (!ids) return []

    return Array.from(ids)
      .map((id) => this.operators.get(id)?.operator)
      .filter((op): op is OperatorType => op !== undefined)
  }

  /**
   * Get all category names
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys())
  }

  /**
   * Search operators by name or description
   */
  search(query: string): OperatorType[] {
    const lowerQuery = query.toLowerCase()
    const results: OperatorType[] = []

    for (const entry of this.operators.values()) {
      const op = entry.operator
      const searchText = `${op.idname} ${op.label} ${op.description || ""}`.toLowerCase()

      if (searchText.includes(lowerQuery)) {
        results.push(op)
      }
    }

    return results
  }

  /**
   * Find operator by keymap
   */
  findByKeymap(
    key: string,
    modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean; osKey?: boolean }
  ): OperatorType | undefined {
    for (const entry of this.keymaps) {
      const km = entry.keymap
      if (
        km.key.toLowerCase() === key.toLowerCase() &&
        (km.shift ?? false) === (modifiers.shift ?? false) &&
        (km.ctrl ?? false) === (modifiers.ctrl ?? false) &&
        (km.alt ?? false) === (modifiers.alt ?? false) &&
        (km.osKey ?? false) === (modifiers.osKey ?? false)
      ) {
        return this.get(entry.operatorId)
      }
    }
    return undefined
  }

  /**
   * Get all registered operators
   */
  getAll(): OperatorType[] {
    return Array.from(this.operators.values()).map((e) => e.operator)
  }

  /**
   * Get operator count
   */
  get count(): number {
    return this.operators.size
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.operators.clear()
    this.keymaps = []
    this.categories.clear()
  }

  /**
   * Extract category from idname (e.g., "MESH_OT_subdivide" -> "MESH")
   */
  private extractCategory(idname: string): string {
    const match = idname.match(/^([A-Z]+)_OT_/)
    return match ? match[1] : "UNKNOWN"
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const operatorRegistry = new OperatorRegistry()

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Register an operator with the global registry
 */
export function registerOperator(operator: OperatorType): void {
  operatorRegistry.register(operator)
}

/**
 * Register multiple operators
 */
export function registerOperators(operators: OperatorType[]): void {
  for (const op of operators) {
    operatorRegistry.register(op)
  }
}

/**
 * Unregister an operator
 */
export function unregisterOperator(idname: string): boolean {
  return operatorRegistry.unregister(idname)
}

/**
 * Get operator by idname
 */
export function getOperator(idname: string): OperatorType | undefined {
  return operatorRegistry.get(idname)
}

/**
 * Search operators
 */
export function searchOperators(query: string): OperatorType[] {
  return operatorRegistry.search(query)
}

/**
 * Get operators by category
 */
export function getOperatorsByCategory(category: string): OperatorType[] {
  return operatorRegistry.getByCategory(category)
}
